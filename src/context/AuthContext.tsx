import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  FirebaseUser,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  collectionGroup,
  serverTimestamp,
  where,
  getDocs,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { UserProfile, UserNotifySettings } from '../types';
import { isExactDefaultWl } from '../utils';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUserWatchlist: (watchlist: string[]) => Promise<void>;
  updateUserSaved: (saved: string[]) => Promise<void>;
  updateUserNotify: (notify: UserNotifySettings) => Promise<void>;
  updateUserProfile: (data: { displayName?: string; bio?: string; showWatchlist?: boolean }) => Promise<void>;
  blockUser: (targetUid: string) => Promise<void>;
  unblockUser: (targetUid: string) => Promise<void>;
  reportUser: (targetUid: string, targetName: string, reason: string, note?: string) => Promise<void>;
}

const defaultNotify: UserNotifySettings = {
  email: true,
  signals: ['insider', 'control', 'pledgeHigh', 'pledgeUp', 'trade', 'disposal', 'fined'],
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
  deleteAccount: async () => {},
  updateUserWatchlist: async () => {},
  updateUserSaved: async () => {},
  updateUserNotify: async () => {},
  updateUserProfile: async () => {},
  blockUser: async () => {},
  unblockUser: async () => {},
  reportUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email === 'smpss96219@gmail.com';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const profileDocRef = doc(db, 'profiles', firebaseUser.uid);
        try {
          const docSnap = await getDoc(userDocRef);

          // Get local watchlist and saved
          let localWl: string[] | null = null;
          let localSaved: string[] = [];
          try {
            const rawWl = localStorage.getItem('wl');
            if (rawWl) localWl = JSON.parse(rawWl);
            const rawSaved = localStorage.getItem('saved');
            if (rawSaved) localSaved = JSON.parse(rawSaved);
          } catch {}

          // Only merge if user explicitly customized their localStorage watchlist (not matching DEFAULT_WL)
          const hasCustomLocalWl = Boolean(localWl && localWl.length > 0 && !isExactDefaultWl(localWl));

          let finalProfile: UserProfile;

          if (!docSnap.exists()) {
            // First time login: new account watchlist must be empty unless customized in localStorage
            const initialWatchlist = hasCustomLocalWl && localWl ? Array.from(new Set(localWl)) : [];
            const mergedSaved = Array.from(new Set(localSaved));

            finalProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '股東會員',
              photoURL: firebaseUser.photoURL || '',
              watchlist: initialWatchlist,
              saved: mergedSaved,
              notify: defaultNotify,
              plan: 'free',
              bio: '',
              showWatchlist: false,
              blocked: [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };

            await setDoc(userDocRef, finalProfile);
            setProfile(finalProfile);

            localStorage.setItem('wl', JSON.stringify(initialWatchlist));
            localStorage.setItem('saved', JSON.stringify(mergedSaved));
          } else {
            const existingData = docSnap.data() as UserProfile;
            let currentWl = existingData.watchlist || [];
            let needsDocUpdate = false;

            if (isExactDefaultWl(currentWl)) {
              currentWl = [];
              needsDocUpdate = true;
            }

            if (hasCustomLocalWl && localWl) {
              const mergedWl = Array.from(new Set([...currentWl, ...localWl]));
              if (mergedWl.length !== currentWl.length) {
                currentWl = mergedWl;
                needsDocUpdate = true;
              }
            }

            const mergedSaved = Array.from(new Set([...(existingData.saved || []), ...localSaved]));
            if (mergedSaved.length !== (existingData.saved?.length || 0)) {
              needsDocUpdate = true;
            }

            finalProfile = {
              ...existingData,
              displayName: firebaseUser.displayName || existingData.displayName || '股東會員',
              photoURL: firebaseUser.photoURL || existingData.photoURL || '',
              watchlist: currentWl,
              saved: mergedSaved,
              notify: existingData.notify || defaultNotify,
              plan: existingData.plan || 'free',
              bio: existingData.bio || '',
              showWatchlist: existingData.showWatchlist ?? false,
              blocked: existingData.blocked || [],
            };

            if (needsDocUpdate) {
              await updateDoc(userDocRef, {
                watchlist: currentWl,
                saved: mergedSaved,
                updatedAt: serverTimestamp(),
              });
            }

            setProfile(finalProfile);
            localStorage.setItem('wl', JSON.stringify(currentWl));
            localStorage.setItem('saved', JSON.stringify(mergedSaved));
          }

          // Sync public profiles/{uid} (WITHOUT EMAIL)
          try {
            const publicSnap = await getDoc(profileDocRef);
            const joinedDate = new Date().toISOString().split('T')[0];
            // Clean up old document if exists
            if (publicSnap.exists()) {
              const oldData = publicSnap.data();
              // Check if there are keys outside of our allowed list (plus potentially some old fields we want to purge)
              const allowedKeys = ['uid', 'name', 'photo', 'bio', 'joinedAt', 'showWatchlist', 'watchlist', 'postCount', 'likeCount'];
              const hasInvalidFields = Object.keys(oldData).some(key => !allowedKeys.includes(key));
              
              if (hasInvalidFields) {
                // Purge invalid fields by rewriting only with valid ones
                await setDoc(profileDocRef, {
                  uid: firebaseUser.uid,
                  name: finalProfile.displayName,
                  photo: finalProfile.photoURL,
                  bio: finalProfile.bio || '',
                  joinedAt: oldData.joinedAt || joinedDate,
                  showWatchlist: finalProfile.showWatchlist ?? false,
                  watchlist: (finalProfile.watchlist || []).slice(0, 50),
                  postCount: oldData.postCount || 0,
                  likeCount: oldData.likeCount || 0,
                });
              } else {
                await updateDoc(profileDocRef, {
                  name: finalProfile.displayName,
                  photo: finalProfile.photoURL,
                  watchlist: (finalProfile.watchlist || []).slice(0, 50),
                  bio: finalProfile.bio || '',
                  showWatchlist: finalProfile.showWatchlist ?? false,
                });
              }
            } else {
              await setDoc(profileDocRef, {
                uid: firebaseUser.uid,
                name: finalProfile.displayName,
                photo: finalProfile.photoURL,
                bio: finalProfile.bio || '',
                joinedAt: joinedDate,
                showWatchlist: finalProfile.showWatchlist ?? false,
                watchlist: (finalProfile.watchlist || []).slice(0, 50),
                postCount: 0,
                likeCount: 0,
              });
            }
          } catch (pErr) {
            console.error('Failed to sync public profile:', pErr);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign In Error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
    } catch (error) {
      console.error('Sign Out Error:', error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      const uid = user.uid;

      // Update posts authored by this user
      const postsQuery = query(collection(db, 'posts'), where('authorId', '==', uid));
      const postsSnap = await getDocs(postsQuery);
      for (const pDoc of postsSnap.docs) {
        await updateDoc(pDoc.ref, {
          authorName: '已刪除的用戶',
          authorPhoto: '',
          updatedAt: serverTimestamp(),
        });
      }

      // Update comments authored by this user using collectionGroup
      const commentsQuery = query(collectionGroup(db, 'comments'), where('authorId', '==', uid));
      const commentsSnap = await getDocs(commentsQuery);
      for (const cDoc of commentsSnap.docs) {
        await updateDoc(cDoc.ref, {
          authorName: '已刪除的用戶',
          authorPhoto: '',
          updatedAt: serverTimestamp(),
        });
      }

      await deleteDoc(doc(db, 'users', uid));
      try {
        await deleteDoc(doc(db, 'profiles', uid));
      } catch {}

      try {
        await user.delete();
      } catch (err: any) {
        if (err && (err.code === 'auth/requires-recent-login' || err.message?.includes('requires-recent-login'))) {
          await signInWithPopup(auth, googleProvider);
          await user.delete();
        } else {
          throw err;
        }
      }

      setProfile(null);
      setUser(null);
    } catch (error) {
      console.error('Delete Account Error:', error);
      throw error;
    }
  };

  const updateUserWatchlist = async (watchlist: string[]) => {
    if (!user) {
      localStorage.setItem('wl', JSON.stringify(watchlist));
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const profileDocRef = doc(db, 'profiles', user.uid);
      await updateDoc(userDocRef, {
        watchlist,
        updatedAt: serverTimestamp(),
      });
      try {
        await updateDoc(profileDocRef, { watchlist });
      } catch {}
      setProfile((prev) => (prev ? { ...prev, watchlist } : null));
      localStorage.setItem('wl', JSON.stringify(watchlist));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateUserSaved = async (saved: string[]) => {
    if (!user) {
      localStorage.setItem('saved', JSON.stringify(saved));
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        saved,
        updatedAt: serverTimestamp(),
      });
      setProfile((prev) => (prev ? { ...prev, saved } : null));
      localStorage.setItem('saved', JSON.stringify(saved));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateUserNotify = async (notify: UserNotifySettings) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        notify,
        updatedAt: serverTimestamp(),
      });
      setProfile((prev) => (prev ? { ...prev, notify } : null));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateUserProfile = async (data: { displayName?: string; bio?: string; showWatchlist?: boolean }) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const profileDocRef = doc(db, 'profiles', user.uid);
      const updatePayload: Record<string, any> = { updatedAt: serverTimestamp() };
      const publicPayload: Record<string, any> = {};

      if (data.displayName !== undefined) {
        updatePayload.displayName = data.displayName;
        publicPayload.name = data.displayName;
      }
      if (data.bio !== undefined) {
        updatePayload.bio = data.bio;
        publicPayload.bio = data.bio;
      }
      if (data.showWatchlist !== undefined) {
        updatePayload.showWatchlist = data.showWatchlist;
        publicPayload.showWatchlist = data.showWatchlist;
      }

      await updateDoc(userDocRef, updatePayload);
      if (Object.keys(publicPayload).length > 0) {
        await updateDoc(profileDocRef, publicPayload);
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
              ...(data.bio !== undefined ? { bio: data.bio } : {}),
              ...(data.showWatchlist !== undefined ? { showWatchlist: data.showWatchlist } : {}),
            }
          : null
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const blockUser = async (targetUid: string) => {
    if (!user || !profile) return;
    const currentBlocked = profile.blocked || [];
    if (currentBlocked.includes(targetUid)) return;
    const updatedBlocked = [...currentBlocked, targetUid];

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        blocked: updatedBlocked,
        updatedAt: serverTimestamp(),
      });
      setProfile((prev) => (prev ? { ...prev, blocked: updatedBlocked } : null));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const unblockUser = async (targetUid: string) => {
    if (!user || !profile) return;
    const currentBlocked = profile.blocked || [];
    if (!currentBlocked.includes(targetUid)) return;
    const updatedBlocked = currentBlocked.filter((id) => id !== targetUid);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        blocked: updatedBlocked,
        updatedAt: serverTimestamp(),
      });
      setProfile((prev) => (prev ? { ...prev, blocked: updatedBlocked } : null));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const reportUser = async (targetUid: string, targetName: string, reason: string, note?: string) => {
    if (!user) return;
    try {
      const reportId = `${targetUid}_${user.uid}`;
      const reportRef = doc(db, 'userReports', reportId);
      await setDoc(reportRef, {
        targetUid,
        targetName,
        reporterUid: user.uid,
        reporterName: profile?.displayName || '股東會員',
        reason,
        note: note || '',
        createdAt: serverTimestamp(),
        resolved: false,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `userReports/${targetUid}_${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        loading,
        loginWithGoogle,
        logout,
        deleteAccount,
        updateUserWatchlist,
        updateUserSaved,
        updateUserNotify,
        updateUserProfile,
        blockUser,
        unblockUser,
        reportUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
