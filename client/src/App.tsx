// src/App.tsx
import "./App.css";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  FieldValue,
} from "firebase/firestore";
import { firebaseApp, db } from "./firebaseConfig";

// screens
import SplashScreen      from "./components/SplashScreen";
import OnboardingScreen  from "./screens/OnboardingScreen";
import GenderSelect      from "./screens/GenderSelect";
import HomePage          from "./screens/HomePage";
import VideoChat         from "./screens/VideoChat";
import VoicePage         from "./screens/VoicePage";
import ChatPage          from "./screens/ChatPage";
import FriendsPage       from "./screens/FriendsPage";
import ProfilePage       from "./screens/ProfilePage";
import ReferToUnlock     from "./screens/ReferToUnlock";
import ReferralCodeScreen from "./screens/ReferralCode";
import UserSetup         from "./screens/UserSetup";
import PersonalChat      from "./screens/PersonalChat";
import AIChatbotPage     from "./screens/AIChatbotPage";

// ──────────────────────────────── types
interface UserData {
  uid: string;
  username?: string | null;
  gender?: string | null;
  language: string;
  onboardingComplete: boolean;
  referralCode?: string | null;
  referredBy?: string | null;
  ownReferralCode: string;   // generated from uid
  referralCount: number;
  premiumUntil?: Timestamp | null;
  createdAt: Timestamp;
}

// ──────────────────────────────── helpers
const generateOwnReferralCode = (uid: string) => uid.slice(0, 6).toUpperCase();

// ──────────────────────────────── component
function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading]   = useState(true);
  const navigate = useNavigate();
  const auth     = getAuth(firebaseApp);

  /* ───────── Splash → anon auth + Firestore bootstrap ───────── */
  useEffect(() => {
    if (showSplash) return; // wait until splash is done

    const bootstrapUser = async () => {
      try {
        // 1) Sign in (or get existing) anonymous user
        const cred = await signInAnonymously(auth);
        const user = cred.user;
        const uid  = user.uid;

        // 2) Fetch / create Firestore user doc
        const userRef = doc(db, "users", uid);
        const snap    = await getDoc(userRef);

        let userData: UserData;

        if (!snap.exists()) {
          // New user → create doc
          userData = {
            uid,
            username: null,
            gender: null,
            language: "en",
            onboardingComplete: false,
            referralCode: null,
            referredBy: null,
            ownReferralCode: generateOwnReferralCode(uid),
            referralCount: 0,
            premiumUntil: null,
            createdAt: serverTimestamp() as unknown as Timestamp,
          };
          await setDoc(userRef, userData);
          console.log("🔥 New user document created");
        } else {
          userData = snap.data() as UserData;

          // 3) Back‑fill missing fields
          const patch: Partial<UserData> = {};
          if (!userData.ownReferralCode)
            patch.ownReferralCode = generateOwnReferralCode(uid);
          if (typeof userData.referralCount !== "number")
            patch.referralCount = 0;
          if (userData.referredBy === undefined) patch.referredBy = null;
          if (userData.referralCode === undefined) patch.referralCode = null;
          if (!userData.createdAt) patch.createdAt = serverTimestamp();
          if (Object.keys(patch).length)
            await updateDoc(userRef, patch).then(() =>
              console.log("🛠 Back‑filled:", patch)
            );
        }

        // 4) Routing based on onboarding flag
        if (!userData.onboardingComplete) {
          navigate("/onboarding", { replace: true });
        }
      } catch (err) {
        console.error("Auth/Firestore init failed:", err);
        navigate("/onboarding", { replace: true }); // safest fallback
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapUser();
  }, [showSplash, auth, navigate]);

  /* ───────── Splash component toggle ───────── */
  if (showSplash)
    return <SplashScreen onComplete={() => setShowSplash(false)} />;

  /* ───────── Loading spinner ───────── */
  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-rose-50">
        <span className="animate-spin border-4 border-rose-400 border-t-transparent rounded-full h-12 w-12" />
      </div>
    );

  /* ───────── Routes ───────── */
  return (
    <Routes>
      <Route path="/"               element={<HomePage />} />
      <Route path="/onboarding"     element={<OnboardingScreen />} />
      <Route path="/user-setup"     element={<UserSetup />} />
      <Route path="/gender-select"  element={<GenderSelect />} />
      <Route path="/video-chat"     element={<VideoChat />} />
      <Route path="/voice"          element={<VoicePage />} />
      <Route path="/chat"           element={<ChatPage />} />
      <Route path="/personal-chat"  element={<PersonalChat />} />
      <Route path="/friends"        element={<FriendsPage />} />
      <Route path="/profile"        element={<ProfilePage />} />
      <Route path="/refer"          element={<ReferToUnlock />} />
      <Route path="/referral-code"  element={<ReferralCodeScreen />} />
      <Route path="/ai-chatbot"     element={<AIChatbotPage />} />
    </Routes>
  );
}

export default App;
