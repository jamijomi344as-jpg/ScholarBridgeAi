"use client";

import React, { useState, useEffect } from "react";
import { Navbar, StudentProfile } from "@/components/Navbar";
import { ProfileModal } from "@/components/ProfileModal";
import { DashboardView } from "@/components/DashboardView";
import { UniversityExplorer } from "@/components/UniversityExplorer";
import { ScholarshipHub } from "@/components/ScholarshipHub";
import { ApplicationTracker, SavedUniversityItem, SavedScholarshipItem } from "@/components/ApplicationTracker";
import { AiSopStudio } from "@/components/AiSopStudio";
import { TaskRoadmap } from "@/components/TaskRoadmap";
import { AiChatMentor } from "@/components/AiChatMentor";
import { ForumSection } from "@/components/ForumSection";
import { CoursesSection } from "@/components/CoursesSection";
import { PaymentsSection } from "@/components/PaymentsSection";
import { RewardsSection } from "@/components/RewardsSection";
import { AdminPanel } from "@/components/AdminPanel";
import { PremiumGate } from "@/components/PremiumGate";
import { FaqSection } from "@/components/FaqSection";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { LocaleProvider } from "@/i18n/LocaleProvider";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Profile management
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<StudentProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNewProfile, setIsNewProfile] = useState(false);

  // Saved Data
  const [savedUniversities, setSavedUniversities] = useState<SavedUniversityItem[]>([]);
  const [savedScholarships, setSavedScholarships] = useState<SavedScholarshipItem[]>([]);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    fetchProfiles();
  }, []);

  // Referral system: capture ?ref=CODE from the URL and keep it for up to
  // 48h so a visitor who browses first and registers later is still credited.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && ref.trim()) {
        localStorage.setItem(
          "scholarbridge_ref",
          JSON.stringify({ code: ref.trim().toUpperCase(), at: Date.now() })
        );
        // Clean the URL so the code isn't shared accidentally.
        const url = new URL(window.location.href);
        url.searchParams.delete("ref");
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      // localStorage unavailable — ignore
    }
  }, []);

  const getStoredReferralCode = (): string | null => {
    try {
      const raw = localStorage.getItem("scholarbridge_ref");
      if (!raw) return null;
      const { code, at } = JSON.parse(raw);
      if (!code || !at || Date.now() - at > 48 * 60 * 60 * 1000) {
        localStorage.removeItem("scholarbridge_ref");
        return null;
      }
      return code;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (activeProfile?.id) {
      fetchSavedUniversities(activeProfile.id);
      fetchSavedScholarships(activeProfile.id);
      fetchTaskCount(activeProfile.id);
    }
  }, [activeProfile?.id]);

  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/profiles");
      const data = await res.json();
      if (data.profiles && data.profiles.length > 0) {
        setProfiles(data.profiles);
        setActiveProfile(data.profiles[0]);
      }
    } catch (err) {
      console.error("Error fetching profiles:", err);
    }
  };

  const fetchSavedUniversities = async (profileId: number) => {
    try {
      const res = await fetch(`/api/saved-universities?profileId=${profileId}`);
      const data = await res.json();
      if (data.savedUniversities) {
        setSavedUniversities(data.savedUniversities);
      }
    } catch (err) {
      console.error("Error fetching saved universities:", err);
    }
  };

  const fetchSavedScholarships = async (profileId: number) => {
    try {
      const res = await fetch(`/api/saved-scholarships?profileId=${profileId}`);
      const data = await res.json();
      if (data.savedScholarships) {
        setSavedScholarships(data.savedScholarships);
      }
    } catch (err) {
      console.error("Error fetching saved scholarships:", err);
    }
  };

  const fetchTaskCount = async (profileId: number) => {
    try {
      const res = await fetch(`/api/tasks?profileId=${profileId}`);
      const data = await res.json();
      if (data.tasks) {
        const pending = data.tasks.filter((t: { isCompleted: boolean }) => !t.isCompleted);
        setTaskCount(pending.length);
      }
    } catch (err) {
      console.error("Error fetching task count:", err);
    }
  };

  const handleSaveProfile = async (formData: Partial<StudentProfile>) => {
    // NOTE: errors are intentionally NOT swallowed here — they propagate to
    // ProfileModal so the user sees a clear message instead of a silent fail.
    if (isNewProfile) {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          referralCode: getStoredReferralCode(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        throw new Error(data.error || "Profil yaratib bo'lmadi");
      }
      setProfiles((prev) => [data.profile, ...prev]);
      setActiveProfile(data.profile);
    } else if (activeProfile) {
      const res = await fetch(`/api/profiles/${activeProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        throw new Error(data.error || "Profil yangilanmadi");
      }
      setProfiles((prev) => prev.map((p) => (p.id === data.profile.id ? data.profile : p)));
      setActiveProfile(data.profile);
    }
  };

  // University Handlers
  const handleSaveUniversity = async (universityId: number) => {
    if (!activeProfile) return;
    try {
      const res = await fetch("/api/saved-universities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: activeProfile.id, universityId }),
      });
      const data = await res.json();
      fetchSavedUniversities(activeProfile.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnsaveUniversity = async (universityId: number) => {
    const item = savedUniversities.find((s) => s.universityId === universityId);
    if (!item) return;
    try {
      await fetch(`/api/saved-universities?id=${item.id}`, { method: "DELETE" });
      setSavedUniversities((prev) => prev.filter((s) => s.id !== item.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSavedUniStatus = async (id: number, status: string, notes?: string) => {
    try {
      await fetch("/api/saved-universities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, notes }),
      });
      if (activeProfile) fetchSavedUniversities(activeProfile.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveSavedUni = async (id: number) => {
    try {
      await fetch(`/api/saved-universities?id=${id}`, { method: "DELETE" });
      setSavedUniversities((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Scholarship Handlers
  const handleSaveScholarship = async (scholarshipId: number) => {
    if (!activeProfile) return;
    try {
      await fetch("/api/saved-scholarships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: activeProfile.id, scholarshipId }),
      });
      fetchSavedScholarships(activeProfile.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnsaveScholarship = async (scholarshipId: number) => {
    const item = savedScholarships.find((s) => s.scholarshipId === scholarshipId);
    if (!item) return;
    try {
      await fetch(`/api/saved-scholarships?id=${item.id}`, { method: "DELETE" });
      setSavedScholarships((prev) => prev.filter((s) => s.id !== item.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSavedScholarshipStatus = async (id: number, status: string, notes?: string) => {
    try {
      await fetch("/api/saved-scholarships", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, notes }),
      });
      if (activeProfile) fetchSavedScholarships(activeProfile.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveSavedScholarship = async (id: number) => {
    try {
      await fetch(`/api/saved-scholarships?id=${id}`, { method: "DELETE" });
      setSavedScholarships((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const savedUniIds = new Set(savedUniversities.map((s) => s.universityId));
  const savedScholarshipIds = new Set(savedScholarships.map((s) => s.scholarshipId));

  // Persist the user's language preference onto the active profile.
  const handleLocaleChange = async (locale: string) => {
    if (!activeProfile?.id) return;
    try {
      await fetch(`/api/profiles/${activeProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLocale: locale }),
      });
      setActiveProfile((prev) => (prev ? { ...prev, preferredLocale: locale } : prev));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <LocaleProvider>
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profiles={profiles}
        activeProfile={activeProfile}
        setActiveProfile={setActiveProfile}
        onOpenProfileModal={(isNew) => {
          setIsNewProfile(!!isNew);
          setIsProfileModalOpen(true);
        }}
        onLocaleChange={handleLocaleChange}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Onboarding wizard — shown for new profiles that haven't completed
            the step-by-step setup yet. Resumes from the saved step. */}
        {activeProfile && !activeProfile.onboardingCompleted ? (
          <OnboardingWizard
            profile={activeProfile}
            onComplete={(updated) => {
              setProfiles((prev) =>
                prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
              );
              setActiveProfile((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
              setActiveTab("dashboard");
            }}
          />
        ) : activeTab === "dashboard" && (
          <DashboardView
            profile={activeProfile}
            onNavigateTab={setActiveTab}
            savedUniCount={savedUniversities.length}
            savedScholarshipCount={savedScholarships.length}
            taskCount={taskCount}
            onEditProfile={() => {
              setIsNewProfile(false);
              setIsProfileModalOpen(true);
            }}
          />
        )}

        {activeTab === "universities" && (
          <UniversityExplorer
            activeProfile={activeProfile}
            savedUniIds={savedUniIds}
            onSaveUniversity={handleSaveUniversity}
            onUnsaveUniversity={handleUnsaveUniversity}
          />
        )}

        {activeTab === "scholarships" && (
          <ScholarshipHub
            activeProfile={activeProfile}
            savedScholarshipIds={savedScholarshipIds}
            onSaveScholarship={handleSaveScholarship}
            onUnsaveScholarship={handleUnsaveScholarship}
          />
        )}

        {activeTab === "tracker" && (
          <ApplicationTracker
            activeProfile={activeProfile}
            savedUniversities={savedUniversities}
            savedScholarships={savedScholarships}
            onUpdateSavedUniStatus={handleUpdateSavedUniStatus}
            onRemoveSavedUni={handleRemoveSavedUni}
            onUpdateSavedScholarshipStatus={handleUpdateSavedScholarshipStatus}
            onRemoveSavedScholarship={handleRemoveSavedScholarship}
          />
        )}

        {activeTab === "sop" && (
          <PremiumGate
            profileId={activeProfile?.id ?? null}
            title="AI SOP & Essays is Premium"
            description="Generate, evaluate and review your Statement of Purpose with AI — an exclusive Premium feature."
            onUpgrade={() => setActiveTab("payments")}
          >
            <AiSopStudio activeProfile={activeProfile} />
          </PremiumGate>
        )}

        {activeTab === "tasks" && (
          <PremiumGate
            profileId={activeProfile?.id ?? null}
            title="Tasks & Roadmap is Premium"
            description="Build and track your study-abroad application roadmap — an exclusive Premium feature."
            onUpgrade={() => setActiveTab("payments")}
          >
            <TaskRoadmap activeProfile={activeProfile} />
          </PremiumGate>
        )}

        {activeTab === "chat" && <AiChatMentor activeProfile={activeProfile} />}

        {activeTab === "forum" && (
          <PremiumGate
            profileId={activeProfile?.id ?? null}
            title="Community Forum is Premium"
            description="Read community topics, join discussions and post your own threads — an exclusive Premium feature."
            onUpgrade={() => setActiveTab("payments")}
          >
            <ForumSection activeProfile={activeProfile} isModerator />
          </PremiumGate>
        )}

        {activeTab === "courses" && (
          <PremiumGate
            profileId={activeProfile?.id ?? null}
            title="Video Courses are Premium"
            description="Watch video courses, take quizzes and earn certificates — an exclusive Premium feature."
            onUpgrade={() => setActiveTab("payments")}
          >
            <CoursesSection activeProfile={activeProfile} />
          </PremiumGate>
        )}

        {activeTab === "payments" && <PaymentsSection activeProfile={activeProfile} />}

        {activeTab === "rewards" && <RewardsSection activeProfile={activeProfile} />}

        {activeTab === "admin" && <AdminPanel activeProfile={activeProfile} />}

        {/* SEO/AEO: FAQ har bir bo'limda sahifa pastida ko'rinadi */}
        <FaqSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} ScholarBridge AI • Democratizing Global Higher Education Access</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => setActiveTab("universities")}>
              University Matcher
            </span>
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => setActiveTab("scholarships")}>
              Scholarship Discovery
            </span>
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => setActiveTab("chat")}>
              Gemini Mentor
            </span>
          </div>
        </div>
      </footer>

      {/* Profile Create / Edit Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        isNew={isNewProfile}
        onClose={() => setIsProfileModalOpen(false)}
        profile={activeProfile}
        onSave={handleSaveProfile}
      />
      </div>
    </LocaleProvider>
  );
}
