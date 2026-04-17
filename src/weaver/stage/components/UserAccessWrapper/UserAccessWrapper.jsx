import { useState, useEffect, createContext, useContext } from 'react';
import Login from '../Login/Login.tsx';
import { useParticipantAuth } from '@/weaver/signals/lib/auth/useParticipantAuth.ts';
import { callVerifySession } from '@/weaver/signals/lib/api/apiClient.js';
import { logger } from '@/weaver/toolkit/utils/logger/logger';

export const UserContext = createContext({
  userId: null,
  userType: null,
  isNamed: false,
  isOtp: false,
  isExp: false,
  accessToken: null,
  userProfile: null,
  isAdmin: false,
  prototype: null,
  chatgptEnabled: true,
  selectedDatabase: null,
  setSelectedDatabase: () => {},
});

export const useUser = () => useContext(UserContext);

const PROFILE_KEY = (userId) => (userId ? `app_profile:${userId}` : null);

async function fetchUserProfile(token) {
  try {
    const res = await fetch('/.netlify/functions/get-profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function UserAccessWrapper({ session, children }) {
  const { pid, prototype: protoFromWhoami, isLoading: pidLoading } = useParticipantAuth();
  const [otpUser, setOtpUser] = useState(null);
  const [otpLoading, setOtpLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const isAdmin = (userProfile?.role || 'user') === 'admin';

  useEffect(() => {
    let cancelled = false;

    if (session?.user) {
      setOtpUser(null);
      setOtpLoading(false);
      return () => { cancelled = true; };
    }

    callVerifySession()
      .then((user) => { if (!cancelled) setOtpUser(user || null); })
      .catch(() => { if (!cancelled) {} })
      .finally(() => { if (!cancelled) setOtpLoading(false); });

    return () => { cancelled = true; };
  }, [session?.user]);

  const hasSupabaseSession = !!session?.user;
  const hasOtpSession = !!otpUser;
  const hasExpCookie = !!pid;
  const stillChecking = pidLoading || (!hasSupabaseSession && otpLoading);

  let userType = null;
  let userId = null;
  let dbUserId = null;
  let accessToken = null;

  if (hasExpCookie) {
    userType = 'experimental';
    userId = `exp:${pid}`;
    dbUserId = pid;
    accessToken = null;
  } else if (hasSupabaseSession) {
    userType = 'named';
    userId = session.user.id;
    dbUserId = session.user.id;
    accessToken = session.access_token;
  } else if (hasOtpSession) {
    userType = 'named';
    userId = otpUser.id;
    dbUserId = otpUser.id;
    accessToken = otpUser.token;
  }

  const isNamed = userType === 'named';
  const isOtp   = !!otpUser && !hasSupabaseSession && !hasExpCookie;
  const isExp   = userType === 'experimental';

  const resolvePrototype = () => {
    const isValid = (v) => v === 'I1' || v === 'I2' || v === 'C1' || v === 'C2';
    const urlProto = new URLSearchParams(window.location.search).get('prototype');
    const lsProto = (() => { try { return localStorage.getItem('prototype'); } catch { return null; } })();
    return (
      (isValid(urlProto) ? urlProto :
       isValid(protoFromWhoami) ? protoFromWhoami :
       isValid(lsProto) ? lsProto : 'I1')
    );
  };

  const prototype = isExp ? resolvePrototype() : null;
  const chatgptEnabled = !(isExp && prototype === 'I2');

  useEffect(() => {
    if (!dbUserId || !userType) return;

    if (isExp && prototype) {
      try { localStorage.setItem('prototype', prototype); } catch {}
    }

    logger.initializeWithConsent(dbUserId, userType, isExp ? (prototype || 'I1') : 'I1');
    logger.uiUserId = userId;

    if (isExp && prototype) {
      logger.setPrototype(prototype);
    } else {
      logger.setPrototype('I1');
    }
  }, [dbUserId, userType, userId, isExp, prototype]);

  useEffect(() => {
    if (accessToken) {
      logger.accessToken = accessToken;
    }
  }, [accessToken]);

  useEffect(() => {
    if (!userId) { setUserProfile(null); return; }
    try {
      const key = PROFILE_KEY(userId);
      const cached = key ? localStorage.getItem(key) : null;
      setUserProfile(cached ? JSON.parse(cached) : null);
    } catch {}
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    if (!dbUserId || !accessToken) return;

    const key = PROFILE_KEY(dbUserId);
    if (key) {
      const cached = localStorage.getItem(key);
      if (cached) return;
    }

    (async () => {
      const profile = await fetchUserProfile(accessToken);
      if (cancelled) return;
      setUserProfile(profile || null);
      try {
        if (key) localStorage.setItem(key, JSON.stringify(profile || {}));
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [dbUserId, accessToken]);

  const applySelectedDatabase = (db) => {
    const normalized = db === 'db_new' || db === 'db_old' ? db : null;
    try {
      if (isAdmin && normalized) {
        sessionStorage.setItem('dbOverride', normalized);
      } else {
        sessionStorage.removeItem('dbOverride');
      }
    } catch {}
    setSelectedDatabase(normalized);
  };

  useEffect(() => {
    const fromProfile =
      userProfile?.preferred_db === 'db_new' || userProfile?.preferred_db === 'db_old'
        ? userProfile.preferred_db
        : 'db_old';
    let override = null;
    try {
      const saved = sessionStorage.getItem('dbOverride');
      if (saved === 'db_new' || saved === 'db_old') override = saved;
    } catch {}
    const next = isAdmin && override ? override : fromProfile;
    setSelectedDatabase(next);
  }, [userProfile, isAdmin]);

  if (stillChecking) return null;

  const hasIdentity = !!userId;
  if (!hasIdentity) {
    return <Login isOpen={true} onClose={() => {}} onLogin={setOtpUser} />;
  }

  return (
    <UserContext.Provider
      value={{
        userId,
        userType,
        isNamed,
        isOtp,
        isExp,
        accessToken,
        userProfile,
        isAdmin,
        prototype,
        chatgptEnabled,
        selectedDatabase,
        setSelectedDatabase: applySelectedDatabase,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
