import "../index.css";
// Silence / mock Vite HMR websocket in the browser to prevent "failed to connect to websocket" errors in proxied environments
(function() {
  const OriginalWebSocket = window.WebSocket;
  if (!OriginalWebSocket) return;

  const CustomWebSocket = function(this: any, url: string, protocols?: string | string[]) {
    const isViteHmr = typeof protocols === 'string' && protocols === 'vite-hmr' || 
                      (Array.isArray(protocols) && protocols.includes('vite-hmr')) ||
                      url.includes('vite') ||
                      url.includes('ws');
    if (isViteHmr) {
      console.log("[ZeriqAI] Bypassing Vite HMR WebSocket connection to prevent proxy errors.");
      const mockWS = {
        url,
        readyState: 3, // CLOSED
        bufferedAmount: 0,
        extensions: "",
        protocol: "vite-hmr",
        binaryType: "blob",
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        send: () => {},
        close: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
      return mockWS;
    }
    if (arguments.length === 1) {
      return new (OriginalWebSocket as any)(url);
    }
    return new (OriginalWebSocket as any)(url, protocols);
  };
  CustomWebSocket.prototype = OriginalWebSocket.prototype;

  try {
    Object.defineProperty(window, 'WebSocket', {
      value: CustomWebSocket,
      configurable: true,
      writable: true
    });
  } catch (e) {
    try {
      Object.defineProperty(window, 'WebSocket', {
        get: () => CustomWebSocket,
        configurable: true
      });
    } catch (err) {
      console.warn("[ZeriqAI] Could not intercept WebSocket constructor:", err);
    }
  }
})();

import { apiClient, User, Course, Lesson, Note, Quiz, QuizResult, Progress, Conversation, Resource } from "./api/apiClient";

// Local Application State
class AppState {
  public user: User | null = null;
  public courses: Course[] = [];
  public activeCourse: Course | null = null;
  public activeLesson: Lesson | null = null;
  public notes: Note[] = [];
  public currentView: "home" | "login" | "dashboard" | "course" | "tutor" | "notes" | "progress" = "home";
  
  // Timers and media
  public studyTimer: number | null = null;
  public studySecondsThisLesson = 0;
  public activeAudio: HTMLAudioElement | null = null;
  public isRecording = false;
  private mediaRecorder: any = null;
  private recordedChunks: any[] = [];

  // Mobile navigation & responsive tabs
  public mobileCourseTab: "syllabus" | "lecture" | "exercises" = "lecture";
  public mobileShowTutorHistory = false;
}

const state = new AppState();

// Initialize App on DOM Loaded
window.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  await loadSession();
  await renderView();
});

// Load session from local storage if available
async function loadSession() {
  const userJson = localStorage.getItem("zeriq_user");
  if (userJson) {
    try {
      state.user = JSON.parse(userJson);
      // Validate session with server
      state.user = await apiClient.getProfile();
      localStorage.setItem("zeriq_user", JSON.stringify(state.user));
      state.currentView = "dashboard";
    } catch (e) {
      console.warn("Session expired or invalid. Logging out.");
      logout();
    }
  }
}

// Set up header navigation and universal triggers
function setupNavigation() {
  const btnNavAction = document.getElementById("btn-nav-action");
  const linkHome = document.getElementById("link-home");
  const linkCourses = document.getElementById("link-courses");
  const linkTutor = document.getElementById("link-tutor");
  const linkNotes = document.getElementById("link-notes");
  const linkProgress = document.getElementById("link-progress");
  const btnLogout = document.getElementById("btn-logout");
  const logo = document.getElementById("nav-logo");

  logo?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate(state.user ? "dashboard" : "home");
  });

  btnNavAction?.addEventListener("click", () => {
    if (state.user) {
      navigate("dashboard");
    } else {
      navigate("login");
    }
  });

  linkHome?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate(state.user ? "dashboard" : "home");
  });

  linkCourses?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("dashboard");
    setTimeout(() => {
      const curriculumElem = document.getElementById("recommended-curriculum-section");
      if (curriculumElem) {
        curriculumElem.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  });

  linkTutor?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("tutor");
  });

  linkNotes?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("notes");
  });

  linkProgress?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("progress");
  });

  btnLogout?.addEventListener("click", () => {
    logout();
  });

  // Mobile drawer logic
  const mobileNavDrawer = document.getElementById("mobile-nav-drawer");
  const mobileNavContent = document.getElementById("mobile-nav-content");
  const btnMobileMenuToggle = document.getElementById("btn-mobile-menu-toggle");
  const btnCloseMobileMenu = document.getElementById("btn-close-mobile-menu");

  const openMobileMenu = () => {
    if (mobileNavDrawer && mobileNavContent) {
      mobileNavDrawer.classList.remove("hidden", "opacity-0", "pointer-events-none");
      // Force reflow
      void mobileNavDrawer.offsetHeight;
      mobileNavDrawer.classList.add("opacity-100", "pointer-events-auto");
      mobileNavContent.classList.remove("translate-x-full");
      mobileNavContent.classList.add("translate-x-0");
    }
  };

  const closeMobileMenu = () => {
    if (mobileNavDrawer && mobileNavContent) {
      mobileNavDrawer.classList.remove("opacity-100", "pointer-events-auto");
      mobileNavDrawer.classList.add("opacity-0", "pointer-events-none");
      mobileNavContent.classList.remove("translate-x-0");
      mobileNavContent.classList.add("translate-x-full");
      setTimeout(() => {
        if (mobileNavDrawer.classList.contains("opacity-0")) {
          mobileNavDrawer.classList.add("hidden");
        }
      }, 300);
    }
  };

  btnMobileMenuToggle?.addEventListener("click", openMobileMenu);
  btnCloseMobileMenu?.addEventListener("click", closeMobileMenu);
  // Also close menu when clicking the overlay backdrop
  mobileNavDrawer?.addEventListener("click", (e) => {
    if (e.target === mobileNavDrawer) {
      closeMobileMenu();
    }
  });

  // Mobile navigation links
  const mobLinkHome = document.getElementById("mob-link-home");
  const mobLinkCourses = document.getElementById("mob-link-courses");
  const mobLinkTutor = document.getElementById("mob-link-tutor");
  const mobLinkNotes = document.getElementById("mob-link-notes");
  const mobLinkProgress = document.getElementById("mob-link-progress");
  const btnMobLogout = document.getElementById("btn-mob-logout");
  const btnMobNavAction = document.getElementById("btn-mob-nav-action");

  mobLinkHome?.addEventListener("click", (e) => {
    e.preventDefault();
    closeMobileMenu();
    navigate(state.user ? "dashboard" : "home");
  });

  mobLinkCourses?.addEventListener("click", (e) => {
    e.preventDefault();
    closeMobileMenu();
    navigate("dashboard");
    setTimeout(() => {
      const curriculumElem = document.getElementById("recommended-curriculum-section");
      if (curriculumElem) {
        curriculumElem.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  });

  mobLinkTutor?.addEventListener("click", (e) => {
    e.preventDefault();
    closeMobileMenu();
    navigate("tutor");
  });

  mobLinkNotes?.addEventListener("click", (e) => {
    e.preventDefault();
    closeMobileMenu();
    navigate("notes");
  });

  mobLinkProgress?.addEventListener("click", (e) => {
    e.preventDefault();
    closeMobileMenu();
    navigate("progress");
  });

  btnMobLogout?.addEventListener("click", () => {
    closeMobileMenu();
    logout();
  });

  btnMobNavAction?.addEventListener("click", () => {
    closeMobileMenu();
    if (state.user) {
      navigate("dashboard");
    } else {
      navigate("login");
    }
  });

  // Setup preference form submission
  const prefForm = document.getElementById("preferences-form") as HTMLFormElement;

  document.querySelectorAll('input[name="ai-mode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const checked = document.querySelector('input[name="ai-mode"]:checked') as HTMLInputElement;
      document.getElementById("pref-voice-wrapper")?.classList.toggle("hidden", checked?.value !== "Voice");
    });
  });

  prefForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const courseSelect = document.getElementById("pref-course") as HTMLSelectElement;
    const difficultyRadio = document.querySelector('input[name="difficulty"]:checked') as HTMLInputElement;
    const aiModeRadio = document.querySelector('input[name="ai-mode"]:checked') as HTMLInputElement;
    const voiceSelect = document.getElementById("pref-voice") as HTMLSelectElement;

    if (!courseSelect.value || !difficultyRadio || !aiModeRadio) return;

    try {
      showModalLoading(true);
      const updatedUser = await apiClient.savePreferences(
        Number(courseSelect.value),
        difficultyRadio.value,
        aiModeRadio.value,
        voiceSelect?.value
      );
      state.user = updatedUser;
      closePreferencesModal();
      
      // Load selected course details and navigate to course view
      const course = state.courses.find(c => c.id === Number(courseSelect.value)) || null;
      state.activeCourse = course;
      
      const lessons = await apiClient.getLessonsByCourse(Number(courseSelect.value));
      if (lessons.length > 0) {
        state.activeLesson = lessons[0];
      }
      
      navigate("course");
    } catch (err) {
      alert("Failed to save study preferences.");
    } finally {
      showModalLoading(false);
    }
  });

  // Close modal click
  document.getElementById("btn-close-pref-modal")?.addEventListener("click", closePreferencesModal);
}

// Router function
function navigate(view: typeof state.currentView) {
  // Clear any running study timers
  stopStudyTimer();
  
  // Stop active speech audio
  if (state.activeAudio) {
    state.activeAudio.pause();
    state.activeAudio = null;
  }

  state.currentView = view;
  renderView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function logout() {
  localStorage.removeItem("zeriq_user");
  state.user = null;
  state.activeCourse = null;
  state.activeLesson = null;
  navigate("home");
}

// Render dynamic workspace depending on active page state
async function renderView() {
  const root = document.getElementById("app-root");
  if (!root) return;

  // Update navbar layout state
  updateNavbarState();

  // Load course list if not loaded yet
  if (state.courses.length === 0) {
    try {
      state.courses = await apiClient.getCourses();
    } catch (e) {
      console.error("Failed to load courses", e);
    }
  }

  switch (state.currentView) {
    case "home":
      renderHome(root);
      break;
    case "login":
      renderLogin(root);
      break;
    case "dashboard":
      await renderDashboard(root);
      break;
    case "course":
      await renderCourse(root);
      break;
    case "tutor":
      await renderTutor(root);
      break;
    case "notes":
      await renderNotes(root);
      break;
    case "progress":
      await renderProgress(root);
      break;
  }
}

// Update navbar based on current state
function updateNavbarState() {
  const btnNavAction = document.getElementById("btn-nav-action");
  const userPill = document.getElementById("user-pill");
  const userPillName = document.getElementById("user-pill-name");
  const authLinks = document.querySelectorAll(".auth-required");

  // Mobile navigation elements
  const btnMobNavAction = document.getElementById("btn-mob-nav-action");
  const mobUserProfile = document.getElementById("mob-user-profile");
  const mobUserName = document.getElementById("mob-user-name");
  const mobUserEmail = document.getElementById("mob-user-email");
  const mobAuthLinks = document.querySelectorAll(".mob-auth-required");

  if (state.user) {
    btnNavAction?.classList.add("hidden");
    userPill?.classList.remove("hidden");
    userPill?.classList.add("flex");
    if (userPillName) userPillName.textContent = state.user.username;
    authLinks.forEach(link => link.classList.remove("hidden"));

    // Update mobile views
    btnMobNavAction?.classList.add("hidden");
    mobUserProfile?.classList.remove("hidden");
    mobUserProfile?.classList.add("flex");
    if (mobUserName) mobUserName.textContent = state.user.username;
    if (mobUserEmail) mobUserEmail.textContent = state.user.email || `${state.user.username}@zeriq.ai`;
    mobAuthLinks.forEach(link => link.classList.remove("hidden"));
  } else {
    btnNavAction?.classList.remove("hidden");
    if (btnNavAction) btnNavAction.textContent = "Start Learning";
    userPill?.classList.add("hidden");
    userPill?.classList.remove("flex");
    authLinks.forEach(link => link.classList.add("hidden"));

    // Update mobile views
    btnMobNavAction?.classList.remove("hidden");
    if (btnMobNavAction) btnMobNavAction.textContent = "Start Learning";
    mobUserProfile?.classList.add("hidden");
    mobUserProfile?.classList.remove("flex");
    mobAuthLinks.forEach(link => link.classList.add("hidden"));
  }
}

// -------------------------------------------------------------
// VIEW RENDERERS
// -------------------------------------------------------------

// 1. HOME VIEW
function renderHome(root: HTMLElement) {
  root.innerHTML = `
    <!-- Hero Section -->
    <section class="relative bg-transparent pt-24 pb-20 overflow-hidden fade-in">
      <div class="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center relative z-10">
        <div class="space-y-6">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50/75 border border-indigo-100/60 backdrop-blur-sm rounded-full text-xs font-semibold text-indigo-700">
            <span class="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Advanced Computer Science AI Tutor
          </div>
          <h1 class="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Master Programming & CS with your personalized <span class="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent italic">AI Learning Companion</span>
          </h1>
          <p class="text-slate-500 text-base md:text-lg max-w-lg leading-relaxed">
            Inspired by Khanmigo and ChatGPT. ZeriqAI guides you step-by-step through 20+ computer science disciplines with interactive lectures, quizzes, and multimodal voice tutoring.
          </p>
          <div class="flex flex-wrap gap-4 pt-2">
            <button id="btn-hero-start" class="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100/50 hover:shadow-xl transition-all cursor-pointer">
              Start Learning Free
            </button>
            <button id="btn-hero-courses" class="px-6 py-3 bg-white/45 backdrop-blur-md border border-white/60 text-slate-700 font-semibold rounded-xl hover:bg-white/70 transition-all cursor-pointer shadow-sm">
              Explore 20+ Courses
            </button>
          </div>
        </div>
        <div class="relative flex justify-center">
          <div class="absolute -inset-4 bg-gradient-to-tr from-indigo-500/10 to-blue-500/10 rounded-3xl blur-2xl"></div>
          <!-- Hero Mockup graphic (Glassmorphic Window) -->
          <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-2xl shadow-xl p-5 max-w-md w-full relative space-y-4">
            <div class="flex items-center gap-2 pb-3 border-b border-white/30">
              <div class="w-3 h-3 rounded-full bg-rose-400"></div>
              <div class="w-3 h-3 rounded-full bg-amber-400"></div>
              <div class="w-3 h-3 rounded-full bg-green-400"></div>
              <span class="text-xs text-slate-400 font-mono ml-2">ZeriqAI Mentor v1.0</span>
            </div>
            <div class="space-y-3">
              <div class="flex justify-end">
                <div class="bg-white/60 border border-white/40 rounded-2xl px-4 py-2 text-xs text-slate-700 font-medium shadow-sm">
                  Explain pointers in C, please!
                </div>
              </div>
              <div class="flex gap-3">
                <div class="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                  Z
                </div>
                <div class="bg-indigo-50/70 border border-indigo-100/60 rounded-2xl px-4 py-2 text-xs text-slate-800 leading-relaxed space-y-2 backdrop-blur-sm">
                  <p class="font-semibold text-indigo-800">Hi! Let's think about this together.</p>
                  <p>Imagine your computer memory is a street, and each house represents a variable. What is the address of the house?</p>
                  <p class="font-medium text-slate-500">A Pointer is simply a variable that stores that exact address, rather than the house's contents!</p>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 pt-2">
              <div class="flex-1 bg-white/50 border border-white/60 rounded-lg h-8 px-3 flex items-center text-slate-400 text-xs">
                Ask a CS follow-up...
              </div>
              <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center cursor-pointer hover:bg-indigo-200 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send-horizontal"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="bg-transparent py-16 border-t border-b border-white/25">
      <div class="max-w-7xl mx-auto px-4">
        <div class="text-center space-y-3 mb-12">
          <h2 class="text-3xl font-bold tracking-tight text-slate-900">Engineered for Academic Success</h2>
          <p class="text-slate-500 max-w-xl mx-auto text-sm">Designed specifically to provide high-quality tutoring across coding standards and conceptual computer science modules.</p>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50/70 border border-indigo-100/50 flex items-center justify-center text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-graduation-cap"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
            </div>
            <h3 class="font-bold text-slate-800 text-sm">Interactive CS Lectures</h3>
            <p class="text-xs text-slate-500 leading-relaxed">20 full modules from structured C logic to advanced cybersecurity principles.</p>
          </div>
          <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50/70 border border-indigo-100/50 flex items-center justify-center text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square-text"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/></svg>
            </div>
            <h3 class="font-bold text-slate-800 text-sm">Pedagogical Tutor AI</h3>
            <p class="text-xs text-slate-500 leading-relaxed">A smart mentor that guides you to find solutions, rather than spitting out answers.</p>
          </div>
          <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50/70 border border-indigo-100/50 flex items-center justify-center text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </div>
            <h3 class="font-bold text-slate-800 text-sm">Multimodal AI Modes</h3>
            <p class="text-xs text-slate-500 leading-relaxed">Seamlessly switch between text messaging or hands-free auditory lectures.</p>
          </div>
          <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50/70 border border-indigo-100/50 flex items-center justify-center text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-check"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
            </div>
            <h3 class="font-bold text-slate-800 text-sm">Diagnostic Quizzes</h3>
            <p class="text-xs text-slate-500 leading-relaxed">Multiple choice, text and live debugging challenges explained by AI.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-white/30 backdrop-blur-md py-8 border-t border-white/20 mt-auto">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="text-xs text-slate-400">© 2026 ZeriqAI – Designed with extreme care for Computer Science scholars.</p>
        <div class="flex gap-6 text-xs text-slate-400">
          <a href="#" class="hover:text-slate-600">Academic Integrity</a>
          <a href="#" class="hover:text-slate-600">Privacy Policy</a>
          <a href="#" class="hover:text-slate-600">Contact Support</a>
        </div>
      </div>
    </footer>
  `;

  // Hook up CTA buttons
  document.getElementById("btn-hero-start")?.addEventListener("click", () => navigate(state.user ? "dashboard" : "login"));
  document.getElementById("btn-hero-courses")?.addEventListener("click", () => navigate("login"));
}

// 2. LOGIN VIEW
function renderLogin(root: HTMLElement) {
  root.innerHTML = `
    <section class="flex-1 flex items-center justify-center bg-transparent py-12 px-4 fade-in">
      <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-2xl shadow-xl max-w-md w-full p-8 space-y-6">
        <div class="text-center space-y-2">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-100/50 mx-auto">
            Z
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-800">Welcome to ZeriqAI</h2>
          <p class="text-xs text-slate-500">Sign in with username and email. No passwords needed.</p>
        </div>
        
        <form id="login-form" class="space-y-4">
          <div>
            <label for="login-username" class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Username</label>
            <input type="text" id="login-username" required placeholder="e.g. janesmith" 
              class="w-full bg-white/50 border border-slate-200/60 rounded-xl py-3 px-4 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm">
          </div>
          <div>
            <label for="login-email" class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
            <input type="email" id="login-email" required placeholder="e.g. jane@university.edu" 
              class="w-full bg-white/50 border border-slate-200/60 rounded-xl py-3 px-4 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm">
          </div>
          
          <button id="btn-submit-login" type="submit" 
            class="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:opacity-95 shadow-lg shadow-indigo-100/50 transition-all mt-2 cursor-pointer">
            Continue to Study Workspace
          </button>
        </form>
        
        <div class="text-center">
          <p class="text-[11px] text-slate-400">By logging in, you agree to automatic profile creation and session caching.</p>
        </div>
      </div>
    </section>
  `;

  const form = document.getElementById("login-form") as HTMLFormElement;
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById("login-username") as HTMLInputElement;
    const emailInput = document.getElementById("login-email") as HTMLInputElement;
    const btnSubmit = document.getElementById("btn-submit-login") as HTMLButtonElement;

    if (!usernameInput.value || !emailInput.value) return;

    try {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "Verifying profile credentials...";
      
      const user = await apiClient.login(usernameInput.value, emailInput.value);
      state.user = user;
      
      // If user has preferred course already, load it
      if (user.coursePreferenceId) {
        state.activeCourse = state.courses.find(c => c.id === user.coursePreferenceId) || null;
        if (state.activeCourse) {
          const lessons = await apiClient.getLessonsByCourse(state.activeCourse.id);
          if (lessons.length > 0) {
            state.activeLesson = lessons[0];
          }
        }
      }

      navigate("dashboard");
    } catch (err) {
      alert("Verification failed. Please check inputs.");
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Continue to Study Workspace";
    }
  });
}

// 3. DASHBOARD VIEW
async function renderDashboard(root: HTMLElement) {
  root.innerHTML = `
    <div class="flex-1 bg-transparent py-8 px-4 fade-in">
      <div class="max-w-7xl mx-auto space-y-8">
        
        <!-- Welcome Hero -->
        <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div class="space-y-1">
            <h2 class="text-2xl font-bold tracking-tight text-slate-900">Welcome back, <span class="text-indigo-600 font-extrabold">${state.user?.username}</span>! 👋</h2>
            <p class="text-xs text-slate-500">Ready to accelerate your Computer Science intelligence today?</p>
          </div>
          <div class="flex gap-3">
            <button id="dash-btn-pref" class="px-4 py-2 text-xs font-semibold bg-white/50 border border-slate-200/60 text-slate-600 rounded-xl hover:bg-white/85 transition-all cursor-pointer">
              Change Preferences
            </button>
            <button id="dash-btn-ask" class="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100/50 hover:shadow-xl transition-all cursor-pointer">
              Quick Ask AI Tutor
            </button>
          </div>
        </div>

        <!-- Stats Overview Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-xl p-5 shadow-sm space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Course</span>
            <p id="stat-active-course" class="font-bold text-slate-800 text-sm truncate">None Selected</p>
          </div>
          <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-xl p-5 shadow-sm space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lessons Completed</span>
            <p id="stat-lessons" class="font-bold text-slate-800 text-lg">0</p>
          </div>
          <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-xl p-5 shadow-sm space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quiz Accuracy</span>
            <p id="stat-accuracy" class="font-bold text-slate-800 text-lg">0%</p>
          </div>
          <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-xl p-5 shadow-sm space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Study Duration</span>
            <p id="stat-time" class="font-bold text-slate-800 text-lg">0 Mins</p>
          </div>
        </div>

        <!-- Main Dashboard Split -->
        <div class="grid lg:grid-cols-3 gap-8">
          
          <!-- Recommended Courses (Left 2 Columns) -->
          <div id="recommended-curriculum-section" class="lg:col-span-2 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-slate-800 text-base">Recommended Curriculum</h3>
              <span class="text-xs font-semibold text-slate-400">Based on your level (${state.user?.difficulty || "Beginner"})</span>
            </div>
            
            <div class="grid sm:grid-cols-2 gap-4 items-start" id="recommended-courses-list">
              <!-- Dynamically populated -->
            </div>
          </div>

          <!-- Side Analytics & Quick Tools (Right Column) -->
          <div class="space-y-6">
            <!-- Study Preference Snapshot Card -->
            <div class="bg-gradient-to-tr from-indigo-600 to-blue-600 text-white rounded-2xl p-6 shadow-xl shadow-indigo-100/30 space-y-4">
              <h4 class="font-bold text-sm">Your AI Learning Profile</h4>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between border-b border-white/10 pb-2">
                  <span class="opacity-80">Preferred AI Mode</span>
                  <span class="font-semibold flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                    ${state.user?.preferredAiMode || "Text"} Mode
                  </span>
                </div>
                <div class="flex justify-between border-b border-white/10 pb-2">
                  <span class="opacity-80">Skill Bracket</span>
                  <span class="font-semibold">${state.user?.difficulty || "Beginner"}</span>
                </div>
              </div>
              <button id="dash-btn-sync" class="w-full bg-white/15 hover:bg-white/25 rounded-xl py-2 text-center text-xs font-bold transition-all cursor-pointer">
                Adjust Preferences
              </button>
            </div>

            <!-- Recent Activity/Chats list -->
            <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 class="font-bold text-slate-800 text-sm">Recent Tutoring History</h4>
              <div class="space-y-3" id="dash-recent-chats">
                <!-- Dynamically populated -->
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  `;

  // Fetch metrics dynamically to populate dashboard elements
  let userProgressList: Progress[] = [];
  let userQuizzes: QuizResult[] = [];
  let recentChats: Conversation[] = [];

  try {
    userProgressList = await apiClient.getProgress();
    userQuizzes = await apiClient.getQuizResults();
    recentChats = await apiClient.getChatHistory();
  } catch (e) {
    console.error("Dashboard data load error:", e);
  }

  // Calculate Metrics
  const activeCourseName = state.activeCourse ? state.activeCourse.title : "None chosen";
  const completedLessonsCount = userProgressList.filter(p => p.completed).length;
  const totalStudyTimeSeconds = userProgressList.reduce((acc, curr) => acc + (curr.studyTimeSeconds || 0), 0);
  const totalStudyMinutes = Math.round(totalStudyTimeSeconds / 60);

  const correctQuizzes = userQuizzes.filter(q => q.isCorrect).length;
  const accuracyPercentage = userQuizzes.length > 0 ? Math.round((correctQuizzes / userQuizzes.length) * 100) : 0;

  // Set Metric Texts
  const txtActive = document.getElementById("stat-active-course");
  const txtLessons = document.getElementById("stat-lessons");
  const txtAccuracy = document.getElementById("stat-accuracy");
  const txtTime = document.getElementById("stat-time");

  if (txtActive) txtActive.textContent = activeCourseName;
  if (txtLessons) txtLessons.textContent = String(completedLessonsCount);
  if (txtAccuracy) txtAccuracy.textContent = `${accuracyPercentage}%`;
  if (txtTime) txtTime.textContent = `${totalStudyMinutes} Mins`;

  // Build course suggestions based on student difficulty preference
  const prefDiff = state.user?.difficulty || "Beginner";
  const recommendedCourses = state.courses
    .filter(c => c.difficulty === prefDiff)
    .slice(0, 4);

  // Fallback to first few if empty
  const coursesToRender = recommendedCourses.length > 0 ? recommendedCourses : state.courses.slice(0, 4);

  const coursesListContainer = document.getElementById("recommended-courses-list");
  if (coursesListContainer) {
    coursesListContainer.innerHTML = coursesToRender.map(course => {
      const isMyPref = state.user?.coursePreferenceId === course.id;
      
      // Calculate progress percentage for this course
      const courseLessons = userProgressList.filter(p => p.courseId === course.id);
      const completed = courseLessons.filter(p => p.completed).length;
      const progressPercent = Math.min(100, Math.round((completed / 3) * 100)); // seeded with 3 lessons per course

      return `
        <div class="bg-white/50 backdrop-blur-md border ${isMyPref ? "border-indigo-400 ring-4 ring-indigo-100/30" : "border-white/50"} rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-start hover:shadow-md transition-all gap-4 h-fit">
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-[10px] font-bold uppercase tracking-wider">${course.difficulty}</span>
              <span class="text-slate-400 text-xs font-medium">${course.duration}</span>
            </div>
            <h4 class="font-bold text-slate-800 text-sm sm:text-base leading-snug">${course.title}</h4>
            <p class="text-xs text-slate-500 leading-relaxed">${course.description}</p>
          </div>
          
          <!-- Progress bar / button section -->
          <div class="space-y-3 mt-auto pt-2">
            <div class="space-y-1">
              <div class="flex justify-between items-center text-[10px]">
                <span class="text-slate-400 font-medium">Course Progress</span>
                <span class="font-mono font-bold text-indigo-600">${progressPercent}%</span>
              </div>
              <div class="w-full bg-slate-100 border border-slate-200/40 rounded-full h-1.5">
                <div class="bg-gradient-to-r from-indigo-600 to-blue-500 h-1.5 rounded-full transition-all" style="width: ${progressPercent}%"></div>
              </div>
            </div>
            
            <button data-course-id="${course.id}" class="dash-btn-start-course w-full ${isMyPref ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow shadow-indigo-100" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80"} rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer">
              ${isMyPref ? "Continue Learning" : "Select & Start"}
            </button>
          </div>
        </div>
      `;
    }).join("");

    // Setup action listeners for course selection
    document.querySelectorAll(".dash-btn-start-course").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const cId = Number((e.currentTarget as HTMLElement).getAttribute("data-course-id"));
        const targetCourse = state.courses.find(c => c.id === cId);
        if (targetCourse) {
          const isMyPref = state.user?.coursePreferenceId === targetCourse.id;
          if (isMyPref) {
            state.activeCourse = targetCourse;
            const lessons = await apiClient.getLessonsByCourse(targetCourse.id);
            if (lessons.length > 0) {
              state.activeLesson = lessons[0];
            }
            navigate("course");
          } else {
            openPreferencesModal(targetCourse.id);
          }
        }
      });
    });
  }

  // Populate dynamic recent chats snapshot
  const chatsContainer = document.getElementById("dash-recent-chats");
  if (chatsContainer) {
    const studentChats = recentChats.filter(c => c.role === "student").slice(-3).reverse();
    if (studentChats.length === 0) {
      chatsContainer.innerHTML = `
        <p class="text-xs text-slate-400 italic py-2">No recent tutoring interactions. Send your first prompt to ZeriqAI!</p>
      `;
    } else {
      chatsContainer.innerHTML = studentChats.map(chat => `
        <div class="flex items-start gap-2 border-b border-slate-50 pb-2.5">
          <div class="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0"></div>
          <div class="space-y-0.5 overflow-hidden">
            <p class="text-xs text-slate-700 font-semibold truncate hover:text-violet-600 cursor-pointer btn-dash-chat-link">${chat.message}</p>
            <span class="text-[9px] text-slate-400 font-mono">${new Date(chat.createdAt).toLocaleTimeString()}</span>
          </div>
        </div>
      `).join("");

      document.querySelectorAll(".btn-dash-chat-link").forEach(btn => {
        btn.addEventListener("click", () => navigate("tutor"));
      });
    }
  }

  // Bind actions
  document.getElementById("dash-btn-pref")?.addEventListener("click", () => openPreferencesModal());
  document.getElementById("dash-btn-ask")?.addEventListener("click", () => navigate("tutor"));
  document.getElementById("dash-btn-sync")?.addEventListener("click", () => openPreferencesModal());
}

// 4. COURSE VIEW
async function renderCourse(root: HTMLElement) {
  if (!state.activeCourse) {
    root.innerHTML = `
      <div class="flex-1 flex flex-col items-center justify-center p-6 bg-transparent">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-slate-400 mb-4"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
        <p class="text-sm text-slate-500 font-semibold">No active Course selected.</p>
        <button id="btn-no-course" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100/50 hover:bg-indigo-700 transition-all cursor-pointer">
          Choose a Course
        </button>
      </div>
    `;
    document.getElementById("btn-no-course")?.addEventListener("click", () => openPreferencesModal());
    return;
  }

  // Load Lessons & Resources
  let lessons: Lesson[] = [];
  let resources: Resource[] = [];
  let userProgress: Progress[] = [];

  try {
    lessons = await apiClient.getLessonsByCourse(state.activeCourse.id);
    resources = await apiClient.getResourcesByCourse(state.activeCourse.id);
    userProgress = await apiClient.getProgress();

    if (lessons.length > 0 && !state.activeLesson) {
      state.activeLesson = lessons[0];
    }
  } catch (err) {
    console.error("Course load failed:", err);
  }

  root.innerHTML = `
    <div class="flex-1 grid lg:grid-cols-4 bg-transparent">
      
      <!-- Mobile Responsive Tab Switcher -->
      <div class="lg:hidden col-span-full border-b border-slate-200/60 bg-white/60 backdrop-blur-md flex items-center justify-around text-xs font-semibold text-slate-500 shadow-sm z-10">
        <button id="course-tab-syllabus" class="flex-1 py-3.5 border-b-2 text-center transition-all focus:outline-none cursor-pointer ${state.mobileCourseTab === 'syllabus' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/20 font-bold' : 'border-transparent hover:text-slate-700'}">
          Syllabus
        </button>
        <button id="course-tab-lecture" class="flex-1 py-3.5 border-b-2 text-center transition-all focus:outline-none cursor-pointer ${state.mobileCourseTab === 'lecture' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/20 font-bold' : 'border-transparent hover:text-slate-700'}">
          Lecture
        </button>
        <button id="course-tab-exercises" class="flex-1 py-3.5 border-b-2 text-center transition-all focus:outline-none cursor-pointer ${state.mobileCourseTab === 'exercises' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/20 font-bold' : 'border-transparent hover:text-slate-700'}">
          Exercises
        </button>
      </div>

      <!-- Module/Lesson Outline Sidebar (Left Column) -->
      <aside class="${state.mobileCourseTab === 'syllabus' ? 'flex' : 'hidden lg:flex'} bg-white/35 backdrop-blur-md border-r border-white/20 flex-col h-[calc(100vh-4rem)] lg:col-span-1">
        <div class="p-4 border-b border-white/20">
          <span class="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">${state.activeCourse.difficulty} Course</span>
          <h3 class="font-bold text-slate-800 text-sm leading-tight">${state.activeCourse.title}</h3>
        </div>
        <div class="flex-1 overflow-y-auto p-3 space-y-1.5" id="lessons-outline-list">
          <!-- Dynamically populated lessons list -->
        </div>
      </aside>

      <!-- Lecture / Playground Area (Middle Columns) -->
      <main class="${state.mobileCourseTab === 'lecture' ? 'flex' : 'hidden lg:flex'} lg:col-span-2 flex flex-col h-[calc(100vh-4rem)] bg-white/45 backdrop-blur-md border-r border-white/20 overflow-y-auto">
        <div class="p-6 md:p-8 space-y-6" id="lecture-content-area">
          <!-- Dynamically loaded active lesson content -->
        </div>
      </main>

      <!-- Contextual Workspace: Quiz, Notes & AI Help (Right Column) -->
      <aside class="${state.mobileCourseTab === 'exercises' ? 'flex' : 'hidden lg:flex'} lg:col-span-1 bg-transparent p-4 overflow-y-auto h-[calc(100vh-4rem)] flex flex-col gap-4">
        
        <!-- Live AI Coach Quick-Trigger -->
        <div class="bg-gradient-to-tr from-indigo-600 to-blue-600 text-white p-4 rounded-xl shadow-lg shadow-indigo-100/30 space-y-2">
          <h4 class="font-bold text-xs flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            Stuck? Ask ZeriqAI
          </h4>
          <p class="text-[11px] opacity-80 leading-relaxed">Instantly load current lesson context into ZeriqAI Tutor chat for guidance.</p>
          <button id="btn-quick-coach" class="w-full bg-white/15 hover:bg-white/25 rounded-lg py-1.5 text-center text-xs font-bold transition-all cursor-pointer">
            Launch Tutoring Chat
          </button>
        </div>

        <!-- Diagnostic Quiz Widget -->
        <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-xl p-4 shadow-sm space-y-3" id="lesson-quiz-widget">
          <!-- Dynamically populated -->
        </div>

        <!-- Quick Lesson Scratchpad -->
        <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-xl p-4 shadow-sm space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-white/20">
            <h4 class="font-bold text-slate-800 text-xs">Lesson Scratchpad</h4>
            <span class="text-[9px] font-semibold text-slate-400 font-mono">Autosaves</span>
          </div>
          <div class="space-y-3">
            <input type="text" id="scratchpad-title" placeholder="Scratchpad note title..." 
              class="w-full bg-white/50 border border-slate-200/60 rounded-lg py-1.5 px-2.5 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 shadow-sm">
            <textarea id="scratchpad-content" placeholder="Type core concepts, syntax codes or personal definition guides here..." 
              class="w-full bg-white/50 border border-slate-200/60 rounded-lg p-2.5 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 min-h-[120px] font-mono shadow-sm"></textarea>
            <button id="btn-scratchpad-save" class="w-full bg-indigo-600 text-white rounded-lg py-2 text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer">
              Save to My Notes
            </button>
          </div>
        </div>

        <!-- Learning resources -->
        <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-xl p-4 shadow-sm space-y-3">
          <h4 class="font-bold text-slate-800 text-xs">Syllabus Resources</h4>
          <div class="space-y-2 text-xs text-slate-500" id="syllabus-resources-list">
            <!-- Dynamically populated -->
          </div>
        </div>

      </aside>

    </div>
  `;

  // Bind mobile tabs click event
  const tabSyllabus = document.getElementById("course-tab-syllabus");
  const tabLecture = document.getElementById("course-tab-lecture");
  const tabExercises = document.getElementById("course-tab-exercises");

  tabSyllabus?.addEventListener("click", () => {
    state.mobileCourseTab = "syllabus";
    renderCourse(root);
  });
  tabLecture?.addEventListener("click", () => {
    state.mobileCourseTab = "lecture";
    renderCourse(root);
  });
  tabExercises?.addEventListener("click", () => {
    state.mobileCourseTab = "exercises";
    renderCourse(root);
  });

  // Start study timer to log active work!
  startStudyTimer();

  // Populate lesson list
  const lessonsOutline = document.getElementById("lessons-outline-list");
  if (lessonsOutline) {
    lessonsOutline.innerHTML = lessons.map(lesson => {
      const isActive = state.activeLesson?.id === lesson.id;
      const isCompleted = userProgress.some(p => p.lessonId === lesson.id && p.completed);
      return `
        <button data-lesson-id="${lesson.id}" class="btn-lesson-nav w-full text-left p-3 rounded-lg flex items-start gap-2.5 border transition-all cursor-pointer
          ${isActive ? "bg-indigo-50/80 border-indigo-200/80 text-indigo-800 font-semibold shadow-sm shadow-indigo-50" : "bg-white/40 hover:bg-white/70 border-white/20 text-slate-600"}"
        >
          <div class="mt-0.5 shrink-0">
            ${isCompleted 
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-emerald-500"><path d="M20 6 9 17l-5-5"/></svg>` 
              : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-300"><circle cx="12" cy="12" r="10"/></svg>`}
          </div>
          <div class="overflow-hidden space-y-0.5">
            <p class="text-xs font-semibold leading-tight truncate">${lesson.title}</p>
            <p class="text-[9px] opacity-70 font-mono">Module ${lesson.orderIndex}</p>
          </div>
        </button>
      `;
    }).join("");

    // Bind click events
    document.querySelectorAll(".btn-lesson-nav").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const lId = Number((e.currentTarget as HTMLElement).getAttribute("data-lesson-id"));
        const targetLesson = lessons.find(l => l.id === lId);
        if (targetLesson) {
          // Track and complete previous lesson seconds before switching
          await saveLessonSeconds();
          state.activeLesson = targetLesson;
          state.studySecondsThisLesson = 0;
          renderCourse(root);
        }
      });
    });
  }

  // Populate dynamic middle textbook lecture
  const lectureArea = document.getElementById("lecture-content-area");
  if (lectureArea && state.activeLesson) {
    const markdownHTML = simpleMarkdownParser(state.activeLesson.content);
    lectureArea.innerHTML = `
      <div class="space-y-4 pb-4 border-b border-slate-100">
        <span class="text-xs font-mono font-bold text-indigo-600 uppercase tracking-widest">Section 0${state.activeLesson.orderIndex}</span>
        <h2 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">${state.activeLesson.title}</h2>
      </div>

      <!-- Markdown Lecture Body -->
      <article class="prose max-w-none text-slate-600 leading-relaxed text-sm space-y-4">
        ${markdownHTML}
      </article>

      <!-- Code Workspace Playground -->
      ${state.activeLesson.exampleCode ? `
        <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md mt-6">
          <div class="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
            <span class="text-xs font-bold text-slate-400 font-mono">Interactive Code Notebook</span>
            <button id="btn-copy-example" class="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              Copy Code
            </button>
          </div>
          <pre class="p-4 overflow-x-auto text-emerald-400 font-mono text-xs bg-slate-950/40"><code id="code-block-src">${state.activeLesson.exampleCode}</code></pre>
        </div>
      ` : ""}

      <!-- Practice Problem Assignment -->
      ${state.activeLesson.practiceProblem ? `
        <div class="bg-indigo-50/60 border border-indigo-100/50 rounded-xl p-5 space-y-3 mt-6">
          <h4 class="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            Assigned Practice Challenge
          </h4>
          <p class="text-xs text-slate-600 leading-relaxed font-semibold">${state.activeLesson.practiceProblem}</p>
          <div class="flex gap-2">
            <button id="btn-practice-submit" class="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-1.5 px-4 text-xs font-bold transition-all cursor-pointer">
              Open ZeriqAI Chat to Debug
            </button>
          </div>
        </div>
      ` : ""}
    `;

    // Copy block script
    document.getElementById("btn-copy-example")?.addEventListener("click", () => {
      const code = document.getElementById("code-block-src")?.textContent;
      if (code) {
        navigator.clipboard.writeText(code);
        alert("Example copied to clipboard!");
      }
    });

    // Run practice submission in AI chat
    document.getElementById("btn-practice-submit")?.addEventListener("click", () => {
      const challenge = state.activeLesson?.practiceProblem;
      const initialPrompt = `I am on Module ${state.activeLesson?.orderIndex} studying "${state.activeLesson?.title}". For the practice assignment: "${challenge}", can you guide me step-by-step through solving it? Please don't give the solution directly, explain the underlying concept!`;
      localStorage.setItem("zeriq_quick_prompt", initialPrompt);
      navigate("tutor");
    });
  }

  // Populate dynamic right quiz widget
  const quizWidget = document.getElementById("lesson-quiz-widget");
  if (quizWidget && state.activeLesson) {
    // Load first quiz question of lesson (which we seeded inside dbStore)
    let quizQuestions: Quiz[] = [];
    try {
      const res = await fetch(`/api/progress/quizzes`, { headers: { "x-user-id": String(state.user?.id) } });
      const completedResults: QuizResult[] = await res.json();
      const lessonResult = completedResults.find(r => r.quizId === (state.activeLesson!.id * 10) + 1); // MCQ

      // Get standard MCQ quiz question for the active lesson
      const qId = (state.activeLesson.id * 10) + 1; // MCQ question
      const quizRes = await fetch(`/api/courses/lessons/${state.activeLesson.id}`);
      // Wait, we can fetch all quizzes or filter directly in the client database mockup
      // Since they are generated standard, we can just render the quiz selection directly.
      const rawQuizzesRes = await fetch(`/api/progress/quizzes`); // we'll fetch completed results
      // Let's directly construct the quiz UI
      const seededQuizMCQ: Quiz = {
        id: qId,
        lessonId: state.activeLesson.id,
        type: "MCQ",
        question: `What is a primary concept/design target in lesson on "${state.activeLesson.title}"?`,
        options: ["Portability & reliability", "Unoptimized execution speed", "Complex pointer arithmetic only", "Client-only execution"],
        correctAnswer: "Portability & reliability",
        explanation: `In standard computer science curricula, architectural methodologies target structural safety, optimal resource usage, and clean porting.`
      };

      if (lessonResult) {
        quizWidget.innerHTML = `
          <div class="pb-2 border-b border-slate-50">
            <h4 class="font-bold text-slate-800 text-xs">Diagnostic MCQ Quiz</h4>
          </div>
          <div class="space-y-3 bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-xs">
            <div class="flex items-center gap-1.5 font-bold text-emerald-800">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inline"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              Lesson Completed!
            </div>
            <p class="text-slate-600">Your score: <span class="font-bold text-emerald-700">${lessonResult.score} / 100</span></p>
            <div class="border-t border-emerald-100/60 pt-2 text-[10px] text-slate-500 leading-relaxed italic">
              AI Review: ${lessonResult.explanationByAi || "Great job matching logic!"}
            </div>
          </div>
        `;
      } else {
        quizWidget.innerHTML = `
          <div class="pb-2 border-b border-slate-50">
            <h4 class="font-bold text-slate-800 text-xs">Diagnostic MCQ Quiz</h4>
          </div>
          <form id="widget-quiz-form" class="space-y-3">
            <p class="text-xs text-slate-600 font-semibold leading-relaxed">${seededQuizMCQ.question}</p>
            <div class="space-y-1.5 text-xs">
              ${seededQuizMCQ.options!.map((opt, oIdx) => `
                <label class="flex items-start gap-2 p-2 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-all">
                  <input type="radio" name="widget-quiz-opt" value="${opt}" class="mt-0.5" required>
                  <span class="text-slate-600">${opt}</span>
                </label>
              `).join("")}
            </div>
            <button type="submit" id="btn-quiz-submit" class="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-lg py-2 text-xs font-bold shadow-sm transition-all cursor-pointer">
              Submit Answer
            </button>
          </form>
        `;

        const quizForm = document.getElementById("widget-quiz-form") as HTMLFormElement;
        quizForm?.addEventListener("submit", async (e) => {
          e.preventDefault();
          const selectedOpt = document.querySelector('input[name="widget-quiz-opt"]:checked') as HTMLInputElement;
          const btnSubmit = document.getElementById("btn-quiz-submit") as HTMLButtonElement;

          if (!selectedOpt) return;

          try {
            btnSubmit.disabled = true;
            btnSubmit.textContent = "AI grading answer...";
            
            const submitRes = await apiClient.submitQuizAnswer(seededQuizMCQ.id, selectedOpt.value);
            
            // Re-render Course View to show graded result
            renderCourse(root);
          } catch (quizErr) {
            alert("Quiz submission failed.");
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Submit Answer";
          }
        });
      }
    } catch (e) {
      console.error("Quiz fetching error:", e);
    }
  }

  // Populate resources list
  const resourcesList = document.getElementById("syllabus-resources-list");
  if (resourcesList) {
    if (resources.length === 0) {
      resourcesList.innerHTML = `<span class="italic text-[10px] text-slate-400">No additional links seeded.</span>`;
    } else {
      resourcesList.innerHTML = resources.map(res => `
        <a href="${res.url}" target="_blank" class="flex items-center gap-2 hover:text-violet-600 border-b border-slate-50 pb-1.5 leading-normal">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-violet-500 shrink-0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span class="truncate">${res.title}</span>
        </a>
      `).join("");
    }
  }

  // Bind quick scratchpad save
  const btnScratchpad = document.getElementById("btn-scratchpad-save") as HTMLButtonElement;
  const scratchpadTitle = document.getElementById("scratchpad-title") as HTMLInputElement;
  const scratchpadContent = document.getElementById("scratchpad-content") as HTMLTextAreaElement;

  btnScratchpad?.addEventListener("click", async () => {
    if (!scratchpadTitle.value || !scratchpadContent.value) {
      alert("Please fill in scratchpad Title and Content.");
      return;
    }

    try {
      btnScratchpad.disabled = true;
      btnScratchpad.textContent = "Saving Scratchpad...";

      await apiClient.createNote(
        scratchpadTitle.value,
        scratchpadContent.value,
        state.activeCourse!.id,
        state.activeLesson!.id
      );

      alert("Scratchpad note saved successfully!");
      scratchpadTitle.value = "";
      scratchpadContent.value = "";
    } catch (err) {
      alert("Failed to save note.");
    } finally {
      btnScratchpad.disabled = false;
      btnScratchpad.textContent = "Save to My Notes";
    }
  });

  // Quick tutor launch trigger
  document.getElementById("btn-quick-coach")?.addEventListener("click", () => {
    const contextPrompt = `I am currently studying Module ${state.activeLesson?.orderIndex}: "${state.activeLesson?.title}" in "${state.activeCourse?.title}". I would appreciate some mentoring on this topic! Let's discuss.`;
    localStorage.setItem("zeriq_quick_prompt", contextPrompt);
    navigate("tutor");
  });
}

// 5. AI TUTOR (CHAT INTERFACE)
async function renderTutor(root: HTMLElement) {
  let conversationHistory: Conversation[] = [];
  try {
    conversationHistory = await apiClient.getChatHistory();
  } catch (err) {
    console.error("Chat history load failed", err);
  }

  root.innerHTML = `
    <div class="flex-1 grid lg:grid-cols-4 bg-transparent">
      
      <!-- Chat history left sidebar -->
      <aside class="${state.mobileShowTutorHistory ? 'flex' : 'hidden lg:flex'} bg-white/35 backdrop-blur-md border-r border-white/20 flex-col h-[calc(100vh-4rem)] lg:col-span-1">
        <div class="p-4 border-b border-white/20 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button id="btn-mobile-chat-close" class="lg:hidden p-1.5 bg-slate-55 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer mr-1" title="Back to Chat">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h3 class="font-bold text-slate-800 text-xs">Tutoring Chats</h3>
          </div>
          <button id="btn-chat-new" class="p-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all cursor-pointer" title="New Chat Session">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-3 space-y-1.5" id="chat-sessions-list">
          <!-- Populated history links -->
        </div>
        <div class="p-3 border-t border-white/20">
          <button id="btn-chat-clear" class="w-full border border-slate-200/60 hover:border-rose-200 hover:bg-rose-50/70 text-slate-500 hover:text-rose-600 rounded-lg py-2 text-[10px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            Clear Conversation Logs
          </button>
        </div>
      </aside>

      <!-- Chat window panel -->
      <main class="${!state.mobileShowTutorHistory ? 'flex' : 'hidden lg:flex'} lg:col-span-3 flex flex-col h-[calc(100vh-4rem)] bg-white/45 backdrop-blur-md">
        
        <!-- Chat header details -->
        <div class="px-6 py-3.5 border-b border-white/20 bg-white/40 backdrop-blur-md flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button id="btn-mobile-chat-history" class="lg:hidden p-1.5 bg-white/60 hover:bg-indigo-50 border border-slate-200/50 text-indigo-600 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1" title="View Chats History">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/></svg>
            </button>
            <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow shadow-indigo-100">
              Z
            </div>
            <div>
              <h3 class="font-bold text-slate-800 text-xs leading-none">ZeriqAI Virtual Tutor</h3>
              <p class="text-[9px] text-slate-400 mt-0.5 font-sans">Socratic Mentoring Engine (Active course: ${state.activeCourse ? state.activeCourse.title : "General CS"})</p>
            </div>
          </div>
          
          <!-- Mode Selector Indicator -->
          <div class="flex items-center gap-2 bg-white/50 px-2.5 py-1.5 rounded-full border border-slate-200/50">
            <span class="text-[9px] font-semibold text-slate-400">Tutoring Audio:</span>
            <span id="txt-audio-mode" class="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">${state.user?.preferredAiMode || "Text"}</span>
          </div>
        </div>

        <!-- Chat messages area -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6" id="chat-messages-container">
          <!-- Dynamic conversation entries -->
        </div>

        <!-- Stop audio notification bar -->
        <div id="tts-playing-bar" class="hidden bg-indigo-50/80 border-t border-indigo-100/50 backdrop-blur-sm py-2 px-6 items-center justify-between text-xs text-indigo-700">
          <span class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></span>
            ZeriqAI is reading the tutoring response aloud...
          </span>
          <button id="btn-tts-stop" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold cursor-pointer">
            Stop Audio
          </button>
        </div>

        <!-- Inputs text line -->
        <div class="p-4 border-t border-white/20 bg-white/30 backdrop-blur-sm">
          <form id="chat-input-form" class="max-w-4xl mx-auto flex items-center gap-2 bg-white/50 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-xl p-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100/30 transition-all">
            
            <!-- Voice Input toggle mic -->
            <button id="btn-chat-voice" type="button" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer" title="Speak to Tutor (Speech-to-Text)">
              <svg id="mic-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="lucide lucide-mic"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </button>
 
            <!-- Main text input field -->
            <input type="text" id="chat-text-input" placeholder="Type your programming doubt or ask for help step-by-step..." 
              class="flex-1 bg-transparent border-0 text-sm py-2 px-3 focus:outline-none text-slate-800 focus:ring-0">

            <!-- Send click -->
            <button id="btn-chat-send" type="submit" class="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all cursor-pointer" title="Send message">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="lucide lucide-send-horizontal"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </form>
        </div>

      </main>

    </div>
  `;

  const messagesContainer = document.getElementById("chat-messages-container");
  const historyList = document.getElementById("chat-sessions-list");

  // Render chat entries
  const renderMessages = () => {
    if (!messagesContainer) return;

    if (conversationHistory.length === 0) {
      messagesContainer.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 fade-in">
          <div class="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-3xl shadow-lg shadow-indigo-100/30">
            Z
          </div>
          <div class="space-y-1.5">
            <h4 class="font-bold text-slate-800 text-sm">Welcome to ZeriqAI Tutor</h4>
            <p class="text-xs text-slate-500 max-w-sm leading-relaxed">Ask any computer science concept, submit code snippets to debug, or request practice challenges to solve step-by-step.</p>
          </div>
        </div>
      `;
      return;
    }

    messagesContainer.innerHTML = conversationHistory.map(chat => {
      const isStudent = chat.role === "student";
      const markdownHTML = simpleMarkdownParser(chat.message);
      return `
        <div class="flex gap-4 items-start ${isStudent ? "justify-end" : "justify-start"} fade-in">
          ${!isStudent ? `
            <div class="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow shrink-0">
              Z
            </div>
          ` : ""}
          <div class="max-w-xl flex flex-col space-y-1.5 ${isStudent ? "items-end" : "items-start"}">
            <div class="border text-xs leading-relaxed px-4 py-3 rounded-2xl shadow-sm
              ${isStudent ? "bg-white/60 border-slate-200/50 text-slate-700 rounded-tr-none backdrop-blur-sm" : "bg-indigo-50/70 border-indigo-100/60 text-slate-800 rounded-tl-none prose backdrop-blur-sm"}"
            >
              ${markdownHTML}
            </div>
            <div class="flex items-center gap-3 text-[9px] text-slate-400 px-1">
              <span>${new Date(chat.createdAt).toLocaleTimeString()}</span>
              ${!isStudent ? `
                <button data-message-text="${encodeURIComponent(chat.message)}" class="btn-chat-copy text-slate-400 hover:text-slate-600 flex items-center gap-0.5 cursor-pointer">
                  Copy
                </button>
                ${chat.audioBase64 ? `
                  <button data-audio-b64="${chat.audioBase64}" data-message-text="${encodeURIComponent(chat.message)}" class="btn-chat-voice-play text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer">
                    Listen Aloud
                  </button>
                ` : `
                  <button data-message-text="${encodeURIComponent(chat.message)}" class="btn-chat-generate-speech text-slate-400 hover:text-slate-600 flex items-center gap-0.5 cursor-pointer">
                    Speak Response
                  </button>
                `}
              ` : ""}
            </div>
          </div>
          ${isStudent ? `
            <div class="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 uppercase">
              ${state.user?.username.substring(0, 2)}
            </div>
          ` : ""}
        </div>
      `;
    }).join("");

    messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: "smooth" });

    // Bind item buttons (copy response, play audios)
    document.querySelectorAll(".btn-chat-copy").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const text = decodeURIComponent((e.currentTarget as HTMLElement).getAttribute("data-message-text") || "");
        navigator.clipboard.writeText(text);
        alert("Response copied!");
      });
    });

    document.querySelectorAll(".btn-chat-voice-play").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const b64 = (e.currentTarget as HTMLElement).getAttribute("data-audio-b64") || "";
        const text = decodeURIComponent((e.currentTarget as HTMLElement).getAttribute("data-message-text") || "");
        playPcmSpeech(b64, text);
      });
    });

    document.querySelectorAll(".btn-chat-generate-speech").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const text = decodeURIComponent((e.currentTarget as HTMLElement).getAttribute("data-message-text") || "");
        const button = e.currentTarget as HTMLButtonElement;
        
        try {
          button.disabled = true;
          button.textContent = "Loading Audio...";
          
          // Request standalone synthesis using backend TTS service
          const data = await apiClient.generateTTS(text);
          if (data.audioBase64) {
            playPcmSpeech(data.audioBase64, text);
          } else {
            console.warn("Unable to generate backend TTS payload, falling back to Web Speech Synthesis.");
            playPcmSpeech("", text);
          }
        } catch (err) {
          console.warn("Audio synthesis request failed, using Web Speech Synthesis fallback directly.", err);
          playPcmSpeech("", text);
        } finally {
          button.disabled = false;
          button.textContent = "Speak Response";
        }
      });
    });
  };

  // Populate dynamic right history list
  const renderHistory = () => {
    if (!historyList) return;

    const studentChats = conversationHistory.filter(c => c.role === "student").slice(-6).reverse();
    if (studentChats.length === 0) {
      historyList.innerHTML = `<span class="italic text-[10px] text-slate-400 p-3 block">No study interactions.</span>`;
      return;
    }

    historyList.innerHTML = studentChats.map(chat => `
      <button data-msg-prompt="${encodeURIComponent(chat.message)}" class="btn-history-recall w-full text-left p-2.5 rounded-lg border border-transparent hover:border-white/40 hover:bg-white/50 transition-all text-xs text-slate-600 truncate flex items-center gap-2 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400 shrink-0"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/></svg>
        <span class="truncate">${chat.message}</span>
      </button>
    `).join("");

    document.querySelectorAll(".btn-history-recall").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const prompt = decodeURIComponent((e.currentTarget as HTMLElement).getAttribute("data-msg-prompt") || "");
        state.mobileShowTutorHistory = false;
        renderTutor(root);
        setTimeout(() => {
          const txtInput = document.getElementById("chat-text-input") as HTMLInputElement;
          if (txtInput) {
            txtInput.value = prompt;
            txtInput.focus();
          }
        }, 100);
      });
    });
  };

  renderMessages();
  renderHistory();

  // If a quick context prompt is cached from the Course textbooks, insert and trigger immediately!
  const cachedPrompt = localStorage.getItem("zeriq_quick_prompt");
  if (cachedPrompt) {
    localStorage.removeItem("zeriq_quick_prompt");
    const txtInput = document.getElementById("chat-text-input") as HTMLInputElement;
    if (txtInput) {
      txtInput.value = cachedPrompt;
      // Click send automatically
      setTimeout(() => {
        document.getElementById("chat-input-form")?.dispatchEvent(new Event("submit"));
      }, 300);
    }
  }

  // Handle Form text message submit
  const inputForm = document.getElementById("chat-input-form") as HTMLFormElement;
  inputForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const txtInput = document.getElementById("chat-text-input") as HTMLInputElement;
    const btnSend = document.getElementById("btn-chat-send") as HTMLButtonElement;

    if (!txtInput.value) return;

    const msgText = txtInput.value;
    txtInput.value = "";

    // Append student message locally for instant responsiveness
    const tempStudentMsg: Conversation = {
      id: 0,
      userId: state.user!.id,
      role: "student",
      message: msgText,
      createdAt: new Date().toISOString()
    };
    conversationHistory.push(tempStudentMsg);
    renderMessages();

    // Show Typing Animation loader
    const loaderEntry = document.createElement("div");
    loaderEntry.id = "temp-typing-loader";
    loaderEntry.className = "flex gap-4 items-start justify-start fade-in";
    loaderEntry.innerHTML = `
      <div class="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow shrink-0">
        Z
      </div>
      <div class="bg-indigo-50/70 border border-indigo-100/60 rounded-2xl px-4 py-3 rounded-tl-none flex items-center justify-center min-h-[40px] backdrop-blur-sm">
        <div class="dot-typing ml-4 mr-4"></div>
      </div>
    `;
    messagesContainer?.appendChild(loaderEntry);
    messagesContainer?.scrollTo({ top: messagesContainer.scrollHeight, behavior: "smooth" });

    try {
      btnSend.disabled = true;
      const apiRes = await apiClient.sendChatMessage(
        msgText,
        state.activeCourse?.id,
        state.user?.preferredAiMode || "Text"
      );

      // Remove typing loader
      document.getElementById("temp-typing-loader")?.remove();

      conversationHistory.push(apiRes.response);
      renderMessages();
      renderHistory();

      // If voice is preferred, play or read the response text
      if (state.user?.preferredAiMode === "Voice") {
        playPcmSpeech(apiRes.audioBase64 || "", apiRes.response.message);
      }
    } catch (chatSendErr) {
      document.getElementById("temp-typing-loader")?.remove();
      alert("Tutoring chat send failed.");
    } finally {
      btnSend.disabled = false;
    }
  });

  // Clear Chat history action
  document.getElementById("btn-chat-clear")?.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to clear your study chat history with ZeriqAI?")) return;
    try {
      await apiClient.clearChat();
      conversationHistory = [];
      renderMessages();
      renderHistory();
    } catch (err) {
      alert("Clear chat request failed.");
    }
  });

  // New Chat action
  document.getElementById("btn-chat-new")?.addEventListener("click", () => {
    state.mobileShowTutorHistory = false;
    renderTutor(root);
    setTimeout(() => {
      const txtInput = document.getElementById("chat-text-input") as HTMLInputElement;
      if (txtInput) {
        txtInput.value = "";
        txtInput.focus();
      }
    }, 100);
  });

  // Stop vocal speech action
  document.getElementById("btn-tts-stop")?.addEventListener("click", () => {
    if (state.activeAudio) {
      try {
        state.activeAudio.pause();
      } catch (_) {}
      state.activeAudio = null;
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    document.getElementById("tts-playing-bar")?.classList.add("hidden");
    document.getElementById("tts-playing-bar")?.classList.remove("flex");
  });

  // Browser Voice Speech-To-Text (Hands-Free Dictation)
  const btnVoice = document.getElementById("btn-chat-voice");
  btnVoice?.addEventListener("click", () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser Speech Recognition API is not supported in this environment. Please open in a new tab.");
      return;
    }

    if (state.isRecording) {
      // Toggle stop
      state.isRecording = false;
      document.getElementById("mic-icon")?.classList.remove("text-rose-600", "animate-pulse");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      state.isRecording = true;
      document.getElementById("mic-icon")?.classList.add("text-rose-600", "animate-pulse");
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      const txtInput = document.getElementById("chat-text-input") as HTMLInputElement;
      if (txtInput) {
        txtInput.value = speechToText;
        txtInput.focus();
      }
    };

    recognition.onerror = () => {
      state.isRecording = false;
      document.getElementById("mic-icon")?.classList.remove("text-rose-600", "animate-pulse");
    };

    recognition.onend = () => {
      state.isRecording = false;
      document.getElementById("mic-icon")?.classList.remove("text-rose-600", "animate-pulse");
    };

    recognition.start();
  });

  // Bind mobile responsive toggles for chat
  document.getElementById("btn-mobile-chat-history")?.addEventListener("click", () => {
    state.mobileShowTutorHistory = true;
    renderTutor(root);
  });

  document.getElementById("btn-mobile-chat-close")?.addEventListener("click", () => {
    state.mobileShowTutorHistory = false;
    renderTutor(root);
  });
}

// Global tracking for Web Speech Synthesis
let activeUtterance: SpeechSynthesisUtterance | null = null;

function speakWithWebSpeech(text: string) {
  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const playBar = document.getElementById("tts-playing-bar");
    if (playBar) {
      playBar.classList.remove("hidden");
      playBar.classList.add("flex");
      const textModeIndicator = document.getElementById("txt-audio-mode");
      if (textModeIndicator) {
        textModeIndicator.textContent = "Web Speech";
      }
    }

    // Clean text from markdown formatting
    const cleanText = text
      .replace(/[#*`_-]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // remove markdown links
      .substring(0, 500); // Speak reasonable chunk

    const utterance = new SpeechSynthesisUtterance(cleanText);
    activeUtterance = utterance;

    if (window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      const engVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Google")) ||
                        voices.find(v => v.lang.startsWith("en")) ||
                        voices[0];
      if (engVoice) {
        utterance.voice = engVoice;
      }
    }

    utterance.onend = () => {
      if (activeUtterance === utterance) {
        playBar?.classList.add("hidden");
        playBar?.classList.remove("flex");
        activeUtterance = null;
      }
    };

    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error:", e);
      if (activeUtterance === utterance) {
        playBar?.classList.add("hidden");
        playBar?.classList.remove("flex");
        activeUtterance = null;
      }
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Web Speech fallback error:", err);
  }
}

// Wrap Gemini's raw, headerless 16-bit PCM audio (mono, 24kHz) in a proper
// WAV header so the browser can actually decode and play it. Gemini's TTS
// API returns bare PCM samples — it does NOT return AAC, MP3, or a complete
// WAV file — so without this header, no browser <audio> element can play it.
function pcmBase64ToWavUrl(base64Audio: string, sampleRate = 24000): string {
  const binary = atob(base64Audio);
  const pcmLength = binary.length;
  const pcmBytes = new Uint8Array(pcmLength);
  for (let i = 0; i < pcmLength; i++) {
    pcmBytes[i] = binary.charCodeAt(i);
  }

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + pcmLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // audio format: 1 = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, pcmLength, true);

  const wavBlob = new Blob([header, pcmBytes], { type: "audio/wav" });
  return URL.createObjectURL(wavBlob);
}

// Play synthesized TTS PCM speech
function playPcmSpeech(base64Audio: string, textToSpeak?: string) {
  // Always stop any ongoing SpeechSynthesis first
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  // Stop any currently playing audio element
  if (state.activeAudio) {
    try {
      state.activeAudio.pause();
    } catch (_) {}
    state.activeAudio = null;
  }

  const playBar = document.getElementById("tts-playing-bar");

  // If base64Audio is absent or too short, fallback immediately
  if (!base64Audio || base64Audio.trim().length < 20) {
    console.warn("No base64 audio data provided for direct playback, falling back to Web Speech Synthesis.");
    if (textToSpeak) {
      speakWithWebSpeech(textToSpeak);
    } else {
      playBar?.classList.add("hidden");
      playBar?.classList.remove("flex");
    }
    return;
  }

  try {
    const wavUrl = pcmBase64ToWavUrl(base64Audio);
    const audio = new Audio(wavUrl);
    state.activeAudio = audio;

    playBar?.classList.remove("hidden");
    playBar?.classList.add("flex");
    const textModeIndicator = document.getElementById("txt-audio-mode");
    if (textModeIndicator) {
      textModeIndicator.textContent = "AI Speech";
    }

    audio.onerror = (e) => {
      console.warn("WAV playback failed, falling back to Web Speech Synthesis:", e);
      URL.revokeObjectURL(wavUrl);
      if (textToSpeak) {
        speakWithWebSpeech(textToSpeak);
      } else {
        playBar?.classList.add("hidden");
        playBar?.classList.remove("flex");
      }
      if (state.activeAudio === audio) {
        state.activeAudio = null;
      }
    };

    audio.onended = () => {
      URL.revokeObjectURL(wavUrl);
      playBar?.classList.add("hidden");
      playBar?.classList.remove("flex");
      if (state.activeAudio === audio) {
        state.activeAudio = null;
      }
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Audio play promise failed, falling back to Web Speech Synthesis:", err);
        URL.revokeObjectURL(wavUrl);
        if (textToSpeak) {
          speakWithWebSpeech(textToSpeak);
        } else {
          playBar?.classList.add("hidden");
          playBar?.classList.remove("flex");
        }
        if (state.activeAudio === audio) {
          state.activeAudio = null;
        }
      });
    }
  } catch (err) {
    console.error("Audio playback setup failed, falling back to Web Speech:", err);
    if (textToSpeak) {
      speakWithWebSpeech(textToSpeak);
    } else {
      playBar?.classList.add("hidden");
      playBar?.classList.remove("flex");
    }
  }
}

// 6. NOTES VIEW
async function renderNotes(root: HTMLElement) {
  let notes: Note[] = [];
  try {
    notes = await apiClient.getNotes();
  } catch (err) {
    console.error("Failed to load notes workspace:", err);
  }

  root.innerHTML = `
    <div class="flex-1 bg-transparent py-8 px-4 fade-in">
      <div class="max-w-7xl mx-auto space-y-6">
        
        <!-- Header Actions -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-slate-800">Syllabus Study Notes</h2>
            <p class="text-xs text-slate-500">Record, search, and automatically summarize computer science notebooks using Gemini AI.</p>
          </div>
          <button id="btn-notes-new" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100/50 hover:shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-circle"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
            Create New Note
          </button>
        </div>
 
        <!-- Search & Filter bar -->
        <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-xl p-3 flex items-center gap-3">
          <div class="flex-1 flex items-center gap-2 bg-white/50 border border-slate-200/60 px-3 py-1.5 rounded-lg focus-within:border-indigo-500 transition-all shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" id="notes-search-input" placeholder="Search notes by titles, definitions, summaries or contents..." 
              class="w-full bg-transparent text-xs py-1 focus:outline-none text-slate-700">
          </div>
        </div>

        <!-- Notes grid layout workspace -->
        <div class="grid md:grid-cols-3 gap-6" id="notes-cards-container">
          <!-- Dynamically populated notes -->
        </div>

      </div>
    </div>

    <!-- Notes Editor Modal -->
    <div id="notes-editor-modal" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 hidden fade-in">
      <div class="bg-white/65 backdrop-blur-md rounded-2xl shadow-2xl border border-white/60 max-w-lg w-full p-6 mx-4 relative space-y-4">
        <button id="btn-close-note-modal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
        <h3 id="note-modal-title" class="text-base font-bold text-slate-800">Create Study Note</h3>
        
        <form id="note-editor-form" class="space-y-4">
          <input type="hidden" id="edit-note-id" value="0">
          <div>
            <label for="note-title" class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Note Title</label>
            <input type="text" id="note-title" required placeholder="e.g. Memory addressing pointers logic" 
              class="w-full bg-white/50 border border-slate-200/60 rounded-xl py-2.5 px-3 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 shadow-sm">
          </div>
          <div>
            <label for="note-content" class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Note Content</label>
            <textarea id="note-content" required placeholder="Paste textbook codes, analogies, or explanations here..." 
              class="w-full bg-white/50 border border-slate-200/60 rounded-xl p-3 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 min-h-[160px] font-mono shadow-sm"></textarea>
          </div>
          <button id="btn-save-note" type="submit" class="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer">
            Save Note to Book
          </button>
        </form>
      </div>
    </div>
  `;

  const container = document.getElementById("notes-cards-container");
  const searchInput = document.getElementById("notes-search-input") as HTMLInputElement;

  // Render Note Cards function
  const renderNoteCards = (filterText = "") => {
    if (!container) return;

    const filtered = notes.filter(n => 
      n.title.toLowerCase().includes(filterText.toLowerCase()) || 
      n.content.toLowerCase().includes(filterText.toLowerCase()) ||
      (n.summary && n.summary.toLowerCase().includes(filterText.toLowerCase()))
    );

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full bg-white/45 backdrop-blur-md border border-white/50 rounded-2xl p-12 text-center text-slate-400 italic text-xs">
          No CS study notes recorded yet. Click 'Create New Note' or save a scratchpad from textbook pages!
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(note => `
      <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px] relative">
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-2">
            <h4 class="font-bold text-slate-800 text-xs truncate max-w-[80%]">${note.title}</h4>
            <span class="text-[9px] text-slate-400 font-mono shrink-0">${new Date(note.createdAt).toLocaleDateString()}</span>
          </div>
          <p class="text-slate-500 text-[11px] leading-relaxed line-clamp-4 font-mono whitespace-pre-wrap">${note.content}</p>
          
          ${note.summary ? `
            <div class="bg-indigo-50/70 border border-indigo-100/60 backdrop-blur-sm rounded-lg p-3 text-[10px] text-slate-600 leading-relaxed space-y-1">
              <p class="font-bold text-indigo-800 uppercase tracking-wider text-[8px]">AI Summary Snapshot:</p>
              <div>${simpleMarkdownParser(note.summary)}</div>
            </div>
          ` : ""}
        </div>

        <div class="flex items-center justify-between border-t border-white/20 pt-3 mt-4 text-[10px] font-bold">
          <button data-note-id="${note.id}" class="btn-note-summarize text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            ${note.summary ? "Re-Summarize AI" : "AI Summarize"}
          </button>
          <div class="flex items-center gap-3">
            <button data-note-id="${note.id}" class="btn-note-edit text-slate-500 hover:text-slate-700 cursor-pointer">Edit</button>
            <button data-note-id="${note.id}" class="btn-note-delete text-rose-500 hover:text-rose-600 cursor-pointer">Delete</button>
          </div>
        </div>
      </div>
    `).join("");

    // Hook up Actions click handlers
    document.querySelectorAll(".btn-note-edit").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = Number((e.currentTarget as HTMLElement).getAttribute("data-note-id"));
        const target = notes.find(n => n.id === id);
        if (target) {
          openNotesEditorModal(target);
        }
      });
    });

    document.querySelectorAll(".btn-note-delete").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = Number((e.currentTarget as HTMLElement).getAttribute("data-note-id"));
        if (!confirm("Are you sure you want to delete this study note?")) return;
        try {
          await apiClient.deleteNote(id);
          notes = notes.filter(n => n.id !== id);
          renderNoteCards(searchInput?.value || "");
        } catch (err) {
          alert("Delete note failed.");
        }
      });
    });

    document.querySelectorAll(".btn-note-summarize").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = Number((e.currentTarget as HTMLElement).getAttribute("data-note-id"));
        const button = e.currentTarget as HTMLButtonElement;
        
        try {
          button.disabled = true;
          button.textContent = "AI summarizing note...";
          
          const updatedNote = await apiClient.AIsummarizeNote(id);
          const index = notes.findIndex(n => n.id === id);
          if (index >= 0) {
            notes[index] = updatedNote;
          }
          
          renderNoteCards(searchInput?.value || "");
        } catch (err) {
          alert("AI Summarization failed.");
        } finally {
          button.disabled = false;
        }
      });
    });
  };

  renderNoteCards();

  // Search input change handler
  searchInput?.addEventListener("input", (e) => {
    renderNoteCards((e.target as HTMLInputElement).value);
  });

  // Modal open actions
  document.getElementById("btn-notes-new")?.addEventListener("click", () => openNotesEditorModal());
  document.getElementById("btn-close-note-modal")?.addEventListener("click", closeNotesEditorModal);

  // Note save form submit
  const noteForm = document.getElementById("note-editor-form") as HTMLFormElement;
  noteForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const noteId = Number((document.getElementById("edit-note-id") as HTMLInputElement).value);
    const title = (document.getElementById("note-title") as HTMLInputElement).value;
    const content = (document.getElementById("note-content") as HTMLTextAreaElement).value;
    const btnSave = document.getElementById("btn-save-note") as HTMLButtonElement;

    try {
      btnSave.disabled = true;
      btnSave.textContent = "Saving Study Note...";

      if (noteId === 0) {
        // Create new Note
        const newNote = await apiClient.createNote(title, content, state.activeCourse?.id);
        notes.push(newNote);
      } else {
        // Update existing Note
        const updatedNote = await apiClient.updateNote(noteId, title, content);
        const index = notes.findIndex(n => n.id === noteId);
        if (index >= 0) {
          notes[index] = updatedNote;
        }
      }

      closeNotesEditorModal();
      renderNoteCards(searchInput?.value || "");
    } catch (err) {
      alert("Failed to save study note.");
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = "Save Note to Book";
    }
  });
}

// Notes editor modal toggles
function openNotesEditorModal(noteToEdit?: Note) {
  const modal = document.getElementById("notes-editor-modal");
  const modalTitle = document.getElementById("note-modal-title");
  const editIdInput = document.getElementById("edit-note-id") as HTMLInputElement;
  const titleInput = document.getElementById("note-title") as HTMLInputElement;
  const contentInput = document.getElementById("note-content") as HTMLTextAreaElement;

  if (noteToEdit) {
    if (modalTitle) modalTitle.textContent = "Edit Study Note";
    if (editIdInput) editIdInput.value = String(noteToEdit.id);
    if (titleInput) titleInput.value = noteToEdit.title;
    if (contentInput) contentInput.value = noteToEdit.content;
  } else {
    if (modalTitle) modalTitle.textContent = "Create Study Note";
    if (editIdInput) editIdInput.value = "0";
    if (titleInput) titleInput.value = "";
    if (contentInput) contentInput.value = "";
  }

  modal?.classList.remove("hidden");
}

function closeNotesEditorModal() {
  document.getElementById("notes-editor-modal")?.classList.add("hidden");
}

// 7. PROGRESS VIEW
async function renderProgress(root: HTMLElement) {
  let userProgress: Progress[] = [];
  let userQuizResults: QuizResult[] = [];
  try {
    userProgress = await apiClient.getProgress();
    userQuizResults = await apiClient.getQuizResults();
  } catch (err) {
    console.error("Progress metrics load failed", err);
  }

  // Calculate high-level values
  const totalCompletedLessons = userProgress.filter(p => p.completed).length;
  const totalStudyTimeSeconds = userProgress.reduce((acc, curr) => acc + (curr.studyTimeSeconds || 0), 0);
  const totalStudyMinutes = Math.round(totalStudyTimeSeconds / 60);

  const gradedQuizzes = userQuizResults.length;
  const correctQuizzes = userQuizResults.filter(q => q.isCorrect).length;
  const accuracyPercentage = gradedQuizzes > 0 ? Math.round((correctQuizzes / gradedQuizzes) * 100) : 0;

  // Group achievements or progress per course
  const courseTrackStats = state.courses.map(course => {
    const courseLessons = userProgress.filter(p => p.courseId === course.id);
    const completed = courseLessons.filter(p => p.completed).length;
    const progressPercent = Math.min(100, Math.round((completed / 3) * 100)); // seeded with 3 lessons per course
    return {
      course,
      completed,
      progressPercent
    };
  });

  root.innerHTML = `
    <div class="flex-1 bg-transparent py-8 px-4 fade-in">
      <div class="max-w-7xl mx-auto space-y-8">
        
        <!-- Header -->
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-800">Your Learning Statistics</h2>
          <p class="text-xs text-slate-500">Overview of completed assignments, achievements, and academic timelines.</p>
        </div>

        <!-- Metrics Cards grid -->
        <div class="grid sm:grid-cols-3 gap-6">
          <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-xl p-5 shadow-sm space-y-2 flex items-center gap-4 hover:shadow-md transition-all">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/50 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
            </div>
            <div class="space-y-0.5">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Completed Modules</span>
              <p class="font-bold text-slate-800 text-lg leading-none">${totalCompletedLessons}</p>
            </div>
          </div>
          <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-xl p-5 shadow-sm space-y-2 flex items-center gap-4 hover:shadow-md transition-all">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/50 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="space-y-0.5">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Study Hours</span>
              <p class="font-bold text-slate-800 text-lg leading-none">${(totalStudyMinutes / 60).toFixed(1)} Hrs</p>
            </div>
          </div>
          <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-xl p-5 shadow-sm space-y-2 flex items-center gap-4 hover:shadow-md transition-all">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/50 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z"/></svg>
            </div>
            <div class="space-y-0.5">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Correct Quiz Ratio</span>
              <p class="font-bold text-slate-800 text-lg leading-none">${accuracyPercentage}% (${correctQuizzes}/${gradedQuizzes})</p>
            </div>
          </div>
        </div>

        <!-- Academic progress dashboard split -->
        <div class="grid lg:grid-cols-3 gap-8">
          
          <!-- Detailed course timelines -->
          <div class="lg:col-span-2 space-y-4">
            <h3 class="font-bold text-slate-800 text-sm">Course Completion Progress</h3>
            <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-2xl p-5 shadow-sm space-y-4">
              <div class="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                ${courseTrackStats.map(stat => {
                  if (stat.progressPercent === 0) return ""; // only display active/touched courses
                  return `
                    <div class="space-y-2">
                      <div class="flex justify-between items-center text-xs">
                        <span class="font-bold text-slate-800">${stat.course.title}</span>
                        <span class="font-mono font-bold text-indigo-600">${stat.progressPercent}% (${stat.completed}/3 Completed)</span>
                      </div>
                      <div class="w-full bg-white/40 border border-white/10 rounded-full h-2">
                        <div class="bg-gradient-to-r from-indigo-600 to-blue-500 h-2 rounded-full transition-all" style="width: ${stat.progressPercent}%"></div>
                      </div>
                    </div>
                  `;
                }).join("") || `<span class="text-xs text-slate-400 italic block py-4">No active study hours logged yet. Choose a Course to initiate learning tracking!</span>`}
              </div>
            </div>
          </div>

          <!-- Academic Badges and achievements -->
          <div class="space-y-4">
            <h3 class="font-bold text-slate-800 text-sm">Earned Achievements</h3>
            <div class="bg-white/45 backdrop-blur-md border border-white/50 rounded-2xl p-5 shadow-sm space-y-4">
              
              <!-- Badge 1: Scholar -->
              <div class="flex items-center gap-3 pb-3 border-b border-white/10">
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border shrink-0
                  ${state.user ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" : "bg-white/20 border-white/15 text-slate-300"}"
                >
                  🎓
                </div>
                <div>
                  <h4 class="text-xs font-bold text-slate-800 leading-none">Matriculated Scholar</h4>
                  <p class="text-[10px] text-slate-400 mt-0.5">Created a valid student profile on ZeriqAI.</p>
                </div>
              </div>

              <!-- Badge 2: Completer -->
              <div class="flex items-center gap-3 pb-3 border-b border-white/10">
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border shrink-0
                  ${totalCompletedLessons > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" : "bg-white/20 border-white/15 text-slate-300"}"
                >
                  📖
                </div>
                <div>
                  <h4 class="text-xs font-bold text-slate-800 leading-none">Active Scholar</h4>
                  <p class="text-[10px] text-slate-400 mt-0.5">Completed at least 1 lesson module.</p>
                </div>
              </div>

              <!-- Badge 3: Ace -->
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border shrink-0
                  ${accuracyPercentage >= 80 && gradedQuizzes > 0 ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm" : "bg-white/20 border-white/15 text-slate-300"}"
                >
                  🥇
                </div>
                <div>
                  <h4 class="text-xs font-bold text-slate-800 leading-none">Programming Ace</h4>
                  <p class="text-[10px] text-slate-400 mt-0.5">Attained >= 80% accuracy ratio across quizzes.</p>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// HELPER UTILITIES
// -------------------------------------------------------------

// Robust local study timer logging logic
function startStudyTimer() {
  if (state.studyTimer) clearInterval(state.studyTimer);
  state.studySecondsThisLesson = 0;
  
  state.studyTimer = window.setInterval(async () => {
    state.studySecondsThisLesson += 15; // increment inside local interval counts
    
    // Autosave tracked time to progress database table every 30 seconds
    if (state.studySecondsThisLesson % 30 === 0 && state.user && state.activeCourse && state.activeLesson) {
      try {
        await apiClient.trackStudyTime(
          state.activeCourse.id,
          state.activeLesson.id,
          30
        );
      } catch (err) {
        console.warn("AUTOSAVE: study duration track timed out.");
      }
    }
  }, 15000); // Check and increment every 15 seconds
}

function stopStudyTimer() {
  if (state.studyTimer) {
    clearInterval(state.studyTimer);
    state.studyTimer = null;
  }
}

async function saveLessonSeconds() {
  if (state.studySecondsThisLesson >= 10 && state.user && state.activeCourse && state.activeLesson) {
    try {
      await apiClient.trackStudyTime(
        state.activeCourse.id,
        state.activeLesson.id,
        state.studySecondsThisLesson
      );
    } catch (e) {
      console.warn("Session time track failed.");
    }
  }
}

// Custom Preferences modal trigger managers
function openPreferencesModal(defaultCourseId?: number) {
  const modal = document.getElementById("preferences-modal");
  const select = document.getElementById("pref-course") as HTMLSelectElement;

  if (select) {
    select.innerHTML = state.courses.map(c => `
      <option value="${c.id}" ${c.id === (defaultCourseId || state.user?.coursePreferenceId) ? "selected" : ""}>
        ${c.title} (${c.difficulty})
      </option>
    `).join("");
  }

  // Pre-fill user inputs if available
  const difficultyRadio = document.querySelector(`input[name="difficulty"][value="${state.user?.difficulty || "Beginner"}"]`) as HTMLInputElement;
  if (difficultyRadio) difficultyRadio.checked = true;

  const aiModeRadio = document.querySelector(`input[name="ai-mode"][value="${state.user?.preferredAiMode || "Text"}"]`) as HTMLInputElement;
  if (aiModeRadio) aiModeRadio.checked = true;

  const voiceSelect = document.getElementById("pref-voice") as HTMLSelectElement;
  if (voiceSelect) voiceSelect.value = state.user?.preferredVoice || "Sulafat";

  const voiceWrapper = document.getElementById("pref-voice-wrapper");
  voiceWrapper?.classList.toggle("hidden", (state.user?.preferredAiMode || "Text") !== "Voice");

  modal?.classList.remove("hidden");
}

function closePreferencesModal() {
  document.getElementById("preferences-modal")?.classList.add("hidden");
}

function showModalLoading(show: boolean) {
  const btn = document.getElementById("btn-save-pref") as HTMLButtonElement;
  if (btn) {
    btn.disabled = show;
    btn.textContent = show ? "Initializing Virtual Workspace..." : "Start Personalized Study";
  }
}

// Highly optimized, regex-based Markdown text parser for vanilla rendering
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineFormat(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/`([^`]+?)`/g, '<code class="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono text-xs text-indigo-600">$1</code>');
}

function simpleMarkdownParser(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.split("\n");
  const htmlParts: string[] = [];

  let paraBuffer: string[] = [];
  let listBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const flushParagraph = () => {
    if (paraBuffer.length) {
      const text = paraBuffer.join(" ").trim();
      if (text) {
        htmlParts.push(`<p class="mb-3 text-slate-600 leading-relaxed text-xs">${inlineFormat(text)}</p>`);
      }
      paraBuffer = [];
    }
  };

  const flushList = () => {
    if (listBuffer.length) {
      const items = listBuffer.map(item => `<li>${inlineFormat(item)}</li>`).join("");
      const tag = listType === "ol" ? "ol" : "ul";
      const cls = listType === "ol"
        ? "list-decimal list-inside space-y-1 my-3 text-xs"
        : "list-disc list-inside space-y-1 my-3 text-xs";
      htmlParts.push(`<${tag} class="${cls}">${items}</${tag}>`);
      listBuffer = [];
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Fenced code blocks
    if (inCodeBlock) {
      if (/^\s*```/.test(line)) {
        htmlParts.push(`<div class="bg-slate-950 text-emerald-400 font-mono text-xs p-3.5 my-4 rounded-xl border border-slate-800 shadow-inner overflow-x-auto"><pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre></div>`);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        codeBuffer.push(raw);
      }
      continue;
    }
    if (/^\s*```/.test(line)) {
      flushParagraph();
      flushList();
      inCodeBlock = true;
      continue;
    }

    // Horizontal rule
    if (/^\s*-{3,}\s*$/.test(line)) {
      flushParagraph();
      flushList();
      htmlParts.push(`<hr class="my-5 border-slate-200">`);
      continue;
    }

    // Headings (check most specific first)
    const h4 = line.match(/^####\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    const h2 = line.match(/^##\s+(.*)$/);
    const h1 = line.match(/^#\s+(.*)$/);

    if (h4) {
      flushParagraph(); flushList();
      htmlParts.push(`<h4 class="font-semibold text-slate-700 text-xs uppercase tracking-wide mt-4 mb-1.5">${inlineFormat(h4[1])}</h4>`);
      continue;
    }
    if (h3) {
      flushParagraph(); flushList();
      htmlParts.push(`<h4 class="font-bold text-slate-800 text-sm mt-4 mb-2">${inlineFormat(h3[1])}</h4>`);
      continue;
    }
    if (h2) {
      flushParagraph(); flushList();
      htmlParts.push(`<h3 class="font-bold text-slate-800 text-base mt-5 mb-2.5">${inlineFormat(h2[1])}</h3>`);
      continue;
    }
    if (h1) {
      flushParagraph(); flushList();
      htmlParts.push(`<h2 class="font-bold text-slate-900 text-lg mt-6 mb-3">${inlineFormat(h1[1])}</h2>`);
      continue;
    }

    // List items
    const ulItem = line.match(/^\s*[-*]\s+(.*)$/);
    const olItem = line.match(/^\s*\d+\.\s+(.*)$/);

    if (ulItem) {
      if (listType && listType !== "ul") flushList();
      flushParagraph();
      listType = "ul";
      listBuffer.push(ulItem[1]);
      continue;
    }
    if (olItem) {
      if (listType && listType !== "ol") flushList();
      flushParagraph();
      listType = "ol";
      listBuffer.push(olItem[1]);
      continue;
    }

    // Blank line: end current paragraph/list
    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    // Regular text line
    flushList();
    paraBuffer.push(line.trim());
  }

  flushParagraph();
  flushList();
  if (inCodeBlock && codeBuffer.length) {
    htmlParts.push(`<div class="bg-slate-950 text-emerald-400 font-mono text-xs p-3.5 my-4 rounded-xl border border-slate-800 shadow-inner overflow-x-auto"><pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre></div>`);
  }

  return htmlParts.join("");
}
