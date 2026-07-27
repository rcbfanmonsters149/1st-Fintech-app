import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDEl_RtHVKVNrN4y-dk5PwyYmgYxTlkC9M",
  authDomain: "fintracker-d7b00.firebaseapp.com",
  projectId: "fintracker-d7b00",
  storageBucket: "fintracker-d7b00.firebasestorage.app",
  messagingSenderId: "304513085106",
  appId: "1:304513085106:web:6003e1362ed44a78f6a3ab",
  measurementId: "G-2NFRTYP2YN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

let state = {
  transactions: [],
  bills: [],
  repayments: [],
};

let spendChartInstance = null;

// ─── DOM References ──────────────────────────────────────────
const landingPage   = document.getElementById("landingPage");
const authOverlay   = document.getElementById("authOverlay");
const appContainer  = document.getElementById("appContainer");

const loginForm     = document.getElementById("loginForm");
const signupForm    = document.getElementById("signupForm");
const loginEmail    = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const signupEmail   = document.getElementById("signupEmail");
const signupPassword= document.getElementById("signupPassword");
const loginError    = document.getElementById("loginError");
const signupError   = document.getElementById("signupError");

const tabLogin      = document.getElementById("tabLogin");
const tabSignup     = document.getElementById("tabSignup");
const panelLogin    = document.getElementById("panelLogin");
const panelSignup   = document.getElementById("panelSignup");

// ─── Show / Hide Helpers ─────────────────────────────────────
function showLanding() {
  landingPage.style.display  = "block";
  authOverlay.style.display  = "none";
  appContainer.style.display = "none";
}

function showAuthModal(tab = "login") {
  landingPage.style.display  = "block";
  authOverlay.style.display  = "flex";
  appContainer.style.display = "none";
  switchAuthTab(tab);
  loginError.textContent  = "";
  signupError.textContent = "";
}

function showApp() {
  landingPage.style.display  = "none";
  authOverlay.style.display  = "none";
  appContainer.style.display = "grid";

  // Populate profile bubble with current user info
  if (currentUser) {
    const email = currentUser.email || "";
    const initial = email.charAt(0).toUpperCase();
    document.getElementById("profileAvatar").textContent      = initial;
    document.getElementById("profilePopupAvatar").textContent = initial;
    document.getElementById("profileEmail").textContent       = email;
    document.getElementById("profilePopupEmail").textContent  = email;
  }
}

function switchAuthTab(tab) {
  if (tab === "login") {
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
    panelLogin.style.display  = "block";
    panelSignup.style.display = "none";
  } else {
    tabSignup.classList.add("active");
    tabLogin.classList.remove("active");
    panelSignup.style.display = "block";
    panelLogin.style.display  = "none";
  }
}

// ─── Landing Page Buttons ────────────────────────────────────
document.getElementById("navLoginBtn").addEventListener("click",   () => showAuthModal("login"));
document.getElementById("navSignupBtn").addEventListener("click",  () => showAuthModal("signup"));
document.getElementById("heroLoginBtn").addEventListener("click",  () => showAuthModal("login"));
document.getElementById("heroSignupBtn").addEventListener("click", () => showAuthModal("signup"));
document.getElementById("bannerSignupBtn").addEventListener("click",() => showAuthModal("signup"));

// ─── Auth Modal Controls ─────────────────────────────────────
document.getElementById("authCloseBtn").addEventListener("click",  () => showLanding());
tabLogin.addEventListener("click",   () => switchAuthTab("login"));
tabSignup.addEventListener("click",  () => switchAuthTab("signup"));
document.getElementById("switchToSignup").addEventListener("click",() => switchAuthTab("signup"));
document.getElementById("switchToLogin").addEventListener("click", () => switchAuthTab("login"));

// Close modal when clicking backdrop
authOverlay.addEventListener("click", (e) => {
  if (e.target === authOverlay) showLanding();
});

// ─── Firebase Auth State ─────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    showApp();
    await loadState();
    render();
  } else {
    currentUser = null;
    state = { transactions: [], bills: [], repayments: [] };
    showLanding();
  }
});

// ─── Login Form ───────────────────────────────────────────────
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  loginError.textContent = "";
  signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value)
    .catch((error) => {
      loginError.textContent = friendlyError(error.code);
    });
});

// ─── Signup Form ──────────────────────────────────────────────
signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  signupError.textContent = "";
  createUserWithEmailAndPassword(auth, signupEmail.value, signupPassword.value)
    .catch((error) => {
      signupError.textContent = friendlyError(error.code);
    });
});


// ─── Profile Bubble ───────────────────────────────────────────
const profileBubble = document.getElementById("profileBubble");
const profilePopup  = document.getElementById("profilePopup");

profileBubble.addEventListener("click", (e) => {
  e.stopPropagation();
  profilePopup.classList.toggle("open");
});

document.getElementById("profileSignOut").addEventListener("click", () => {
  profilePopup.classList.remove("open");
  signOut(auth);
});

// Close popup when clicking outside
document.addEventListener("click", () => {
  profilePopup.classList.remove("open");
});

// ─── Friendly Error Messages ──────────────────────────────────
function friendlyError(code) {
  const map = {
    "auth/invalid-email":          "Please enter a valid email address.",
    "auth/user-not-found":         "No account found with that email.",
    "auth/wrong-password":         "Incorrect password. Please try again.",
    "auth/email-already-in-use":   "An account with this email already exists.",
    "auth/weak-password":          "Password must be at least 6 characters.",
    "auth/invalid-credential":     "Invalid email or password. Please try again.",
    "auth/too-many-requests":      "Too many attempts. Please try again later.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const today = new Date();
const todayISO = today.toISOString().slice(0, 10);

const views = {
  overview: "Overview",
  transactions: "Transactions",
  bills: "Monthly bills",
  repayments: "Repayments",
  insights: "Insights",
};

document.querySelectorAll('input[type="date"]').forEach((input) => {
  input.value = todayISO;
});

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.getElementById("transactionForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const form = new FormData(event.currentTarget);

  state.transactions.push({
    id: crypto.randomUUID(),
    amount: Number(form.get("amount")),
    type: form.get("type"),
    category: form.get("category"),
    note: form.get("note").trim(),
    date: form.get("date"),
  });

  event.currentTarget.reset();
  event.currentTarget.elements.date.value = todayISO;

  saveAndRender();
});

document.getElementById("billForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const form = new FormData(event.currentTarget);

  state.bills.push({
    id: crypto.randomUUID(),
    name: form.get("name").trim(),
    amount: Number(form.get("amount")),
    dueDay: Number(form.get("dueDay")),
    status: form.get("status"),
  });

  event.currentTarget.reset();

  saveAndRender();
});

document.getElementById("repaymentForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const form = new FormData(event.currentTarget);
  const total = Number(form.get("total"));
  const paid = Math.min(Number(form.get("paid")), total);

  state.repayments.push({
    id: crypto.randomUUID(),
    name: form.get("name").trim(),
    total,
    paid,
    dueDate: form.get("dueDate"),
  });

  event.currentTarget.reset();
  event.currentTarget.elements.dueDate.value = todayISO;

  saveAndRender();
});

document.getElementById("seedDemo").addEventListener("click", () => {
  if (!confirm("Load demo data? This will overwrite your current data.")) return;
  Object.assign(state, demoState());
  saveAndRender();
});

document.getElementById("clearData").addEventListener("click", () => {
  if (!confirm("Clear all finance data from this browser?")) return;

  state.transactions = [];
  state.bills = [];
  state.repayments = [];

  saveAndRender();
});

async function loadState() {
  if (!currentUser) return;
  const docRef = doc(db, "users", currentUser.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    // Ensure all keys exist in case of old data format
    state.transactions = Array.isArray(data.transactions) ? data.transactions : [];
    state.bills        = Array.isArray(data.bills)        ? data.bills        : [];
    state.repayments   = Array.isArray(data.repayments)   ? data.repayments   : [];
  } else {
    state = {
      transactions: [],
      bills: [],
      repayments: [],
    };
  }
}

function saveAndRender() {
  // Render UI immediately so the user sees changes instantly
  render();

  // Then save to Firestore in the background (non-blocking)
  if (currentUser) {
    setDoc(doc(db, "users", currentUser.uid), {
      transactions: state.transactions,
      bills: state.bills,
      repayments: state.repayments,
    }).catch((err) => {
      console.error("Firestore save error:", err);
    });
  }
}

function switchView(view) {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("active", section.id === view);
  });

  document.getElementById("viewTitle").textContent = views[view];
}

function render() {
  const income = sum(
    state.transactions.filter((item) => item.type === "income"),
    "amount"
  );

  const expenses = sum(
    state.transactions.filter((item) => item.type === "expense"),
    "amount"
  );

  const pendingRepayments = state.repayments.reduce((total, item) => {
    return total + Math.max(item.total - item.paid, 0);
  }, 0);

  const unpaidBills = state.bills.filter((bill) => bill.status === "unpaid");

  setText("totalIncome", money.format(income));
  setText("totalSpend", money.format(expenses));
  setText("upcomingBills", String(unpaidBills.length));
  setText("pendingRepayments", money.format(pendingRepayments));

  setText("sideIncome", money.format(income));
  setText("sideSpent", money.format(expenses));
  setText("sideBalance", money.format(income - expenses));

  renderTransactions();
  renderBills();
  renderRepayments();
  renderPieChart();
  renderDueSoon();
  renderInsights();
  renderCategoryButtons();
}

function renderTransactions() {
  const list = document.getElementById("transactionList");

  const sorted = [...state.transactions].sort((a, b) => {
    return b.date.localeCompare(a.date);
  });

  setText("transactionCount", `${sorted.length} entries`);

  if (sorted.length === 0) {
    list.innerHTML = empty("No transactions yet.");
    return;
  }

  list.innerHTML = sorted
    .map((item) => {
      return `
        <article class="list-item">
          <div>
            <h4>${escapeHtml(item.note)}</h4>
            <p>${item.category} • ${formatDate(item.date)}</p>
          </div>

          <div>
            <div class="amount ${item.type === "income" ? "positive" : "negative"}">
              ${item.type === "income" ? "+" : "-"}${money.format(item.amount)}
            </div>

            <button class="small-button" onclick="removeItem('transactions', '${item.id}')">
              Remove
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderBills() {
  const list = document.getElementById("billList");

  const sorted = [...state.bills].sort((a, b) => {
    return a.dueDay - b.dueDay;
  });

  setText("billCount", `${sorted.length} bills`);

  if (sorted.length === 0) {
    list.innerHTML = empty("No monthly bills added.");
    return;
  }

  list.innerHTML = sorted
    .map((bill) => {
      return `
        <article class="list-item">
          <div>
            <h4>${escapeHtml(bill.name)}</h4>
            <p>Due every month on day ${bill.dueDay}</p>
          </div>

          <div>
            <div class="amount">${money.format(bill.amount)}</div>
            
            <div style="display: flex; gap: 6px; margin-top: 8px;">
              <button class="small-button" onclick="toggleBill('${bill.id}')">
                ${bill.status === "paid" ? "Mark unpaid" : "Mark paid"}
              </button>
              <button class="small-button" onclick="removeItem('bills', '${bill.id}')">
                Remove
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderRepayments() {
  const list = document.getElementById("repaymentList");

  setText("repaymentCount", `${state.repayments.length} plans`);

  if (state.repayments.length === 0) {
    list.innerHTML = empty("No repayments to track.");
    return;
  }

  list.innerHTML = state.repayments
    .map((item) => {
      const pending = Math.max(item.total - item.paid, 0);
      const progress = item.total ? Math.round((item.paid / item.total) * 100) : 0;

      return `
        <article class="list-item">
          <div>
            <h4>${escapeHtml(item.name)}</h4>
            <p>${progress}% paid • due ${formatDate(item.dueDate)}</p>

            <div class="bar-track">
              <div class="bar-fill" style="width:${progress}%"></div>
            </div>
          </div>

          <div>
            <div class="amount">${money.format(pending)} left</div>

            <button class="small-button" onclick="removeItem('repayments', '${item.id}')">
              Remove
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPieChart() {
  const categories = categoryTotals();
  const largest = categories[0];

  setText(
    "largestCategory",
    largest ? `Highest: ${largest.category}` : "No spending yet"
  );

  const canvas = document.getElementById("spendChart");
  if (!canvas) return; // In case the DOM isn't ready

  if (categories.length === 0) {
    if (spendChartInstance) {
      spendChartInstance.destroy();
      spendChartInstance = null;
    }
    return;
  }

  const labels = categories.map(c => c.category);
  const data = categories.map(c => c.total);
  const totalSpend = data.reduce((a, b) => a + b, 0);

  if (spendChartInstance) {
    spendChartInstance.data.labels = labels;
    spendChartInstance.data.datasets[0].data = data;
    spendChartInstance.update();
  } else {
    spendChartInstance = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            "#117a65", "#4ecdb4", "#2d6cdf", "#febc2e", "#ff5f57", "#9b59b6", "#34495e", "#e67e22", "#1abc9c"
          ],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'right',
            labels: { 
              boxWidth: 12, 
              usePointStyle: true,
              font: { family: 'Inter', size: 11 } 
            }
          },
          tooltip: {
            backgroundColor: 'rgba(10, 22, 40, 0.9)',
            titleFont: { family: 'Inter', size: 13 },
            bodyFont: { family: 'Inter', size: 13, weight: 'bold' },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const value = context.parsed;
                const percentage = Math.round((value / totalSpend) * 100);
                return ` ₹${value.toLocaleString('en-IN')} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
}

function renderDueSoon() {
  const list = document.getElementById("dueSoonList");

  const dueBills = state.bills
    .filter((bill) => bill.status === "unpaid")
    .map((bill) => ({
      ...bill,
      daysLeft: daysUntilBill(bill.dueDay),
    }))
    .filter((bill) => bill.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (dueBills.length === 0) {
    list.innerHTML = empty("No unpaid bills due in the next 7 days.");
    return;
  }

  list.innerHTML = dueBills
    .map((bill) => {
      return `
        <article class="list-item">
          <div>
            <h4>${escapeHtml(bill.name)}</h4>
            <p>${bill.daysLeft === 0 ? "Due today" : `Due in ${bill.daysLeft} days`}</p>
          </div>

          <div>
            <div class="amount">${money.format(bill.amount)}</div>
            <span class="status-pill alert">Unpaid</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderInsights() {
  const container = document.getElementById("insightCards");

  const income = sum(
    state.transactions.filter((item) => item.type === "income"),
    "amount"
  );

  const expenses = sum(
    state.transactions.filter((item) => item.type === "expense"),
    "amount"
  );

  const savingsRate = income
    ? Math.round(((income - expenses) / income) * 100)
    : 0;

  const largest = categoryTotals()[0];

  const unpaidTotal = sum(
    state.bills.filter((bill) => bill.status === "unpaid"),
    "amount"
  );

  const insights = [
    income
      ? `Your current savings rate is ${savingsRate}%.`
      : "Add income to calculate your savings rate.",

    largest
      ? `${largest.category} is your biggest spend category at ${money.format(largest.total)}.`
      : "Add expenses to discover your top spending category.",

    unpaidTotal
      ? `You still have ${money.format(unpaidTotal)} in unpaid monthly bills.`
      : "All added bills are marked paid.",
  ];

  container.innerHTML = insights
    .map((text) => {
      return `
        <article class="list-item">
          <div>
            <h4>${text}</h4>
            <p>Updated from your saved data</p>
          </div>

          <span class="status-pill good">Insight</span>
        </article>
      `;
    })
    .join("");
}

function renderCategoryButtons(activeCategory = "All") {
  const categories = [
    "All",
    ...new Set(state.transactions.map((item) => item.category)),
  ];

  const buttons = document.getElementById("categoryButtons");

  buttons.innerHTML = categories
    .map((category) => {
      return `
        <button class="chip-button ${category === activeCategory ? "active" : ""}" onclick="filterCategory('${category}')">
          ${category}
        </button>
      `;
    })
    .join("");

  filterCategory(activeCategory, false);
}

function filterCategory(category, rerenderButtons = true) {
  if (rerenderButtons) {
    renderCategoryButtons(category);
  }

  const list = document.getElementById("filteredTransactions");

  const items =
    category === "All"
      ? state.transactions
      : state.transactions.filter((item) => item.category === category);

  if (items.length === 0) {
    list.innerHTML = empty("No transactions in this filter.");
    return;
  }

  list.innerHTML = items
    .slice(-8)
    .reverse()
    .map((item) => {
      return `
        <article class="list-item">
          <div>
            <h4>${escapeHtml(item.note)}</h4>
            <p>${item.category} • ${formatDate(item.date)}</p>
          </div>

          <div class="amount ${item.type === "income" ? "positive" : "negative"}">
            ${item.type === "income" ? "+" : "-"}${money.format(item.amount)}
          </div>
        </article>
      `;
    })
    .join("");
}

function toggleBill(id) {
  const bill = state.bills.find((item) => item.id === id);

  if (!bill) return;

  bill.status = bill.status === "paid" ? "unpaid" : "paid";

  saveAndRender();
}

function removeItem(collection, id) {
  state[collection] = state[collection].filter((item) => item.id !== id);

  saveAndRender();
}

function categoryTotals() {
  const totals = new Map();

  state.transactions
    .filter((item) => item.type === "expense")
    .forEach((item) => {
      totals.set(item.category, (totals.get(item.category) || 0) + item.amount);
    });

  return [...totals.entries()]
    .map(([category, total]) => ({
      category,
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

function daysUntilBill(day) {
  const due = new Date(today.getFullYear(), today.getMonth(), Math.min(day, 31));

  if (due < today) {
    due.setMonth(due.getMonth() + 1);
  }

  return Math.ceil((due - today) / 86400000);
}

function demoState() {
  return {
    transactions: [
      {
        id: crypto.randomUUID(),
        amount: 65000,
        type: "income",
        category: "Salary",
        note: "Monthly salary",
        date: todayISO,
      },
      {
        id: crypto.randomUUID(),
        amount: 2200,
        type: "expense",
        category: "Food",
        note: "Groceries",
        date: todayISO,
      },
      {
        id: crypto.randomUUID(),
        amount: 850,
        type: "expense",
        category: "Transport",
        note: "Metro card",
        date: todayISO,
      },
      {
        id: crypto.randomUUID(),
        amount: 3200,
        type: "expense",
        category: "Shopping",
        note: "Shoes",
        date: todayISO,
      },
    ],

    bills: [
      {
        id: crypto.randomUUID(),
        name: "Rent",
        amount: 18000,
        dueDay: 5,
        status: "unpaid",
      },
      {
        id: crypto.randomUUID(),
        name: "Electricity",
        amount: 1600,
        dueDay: 12,
        status: "paid",
      },
      {
        id: crypto.randomUUID(),
        name: "Phone plan",
        amount: 499,
        dueDay: 28,
        status: "unpaid",
      },
    ],

    repayments: [
      {
        id: crypto.randomUUID(),
        name: "Credit card",
        total: 12000,
        paid: 5000,
        dueDate: todayISO,
      },
      {
        id: crypto.randomUUID(),
        name: "Friend loan",
        total: 4000,
        paid: 1500,
        dueDate: todayISO,
      },
    ],
  };
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function empty(text) {
  return `<div class="empty">${text}</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.toggleBill = toggleBill;
window.removeItem = removeItem;
window.filterCategory = filterCategory;

// Render is now handled by onAuthStateChanged
