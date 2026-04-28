const storeKey = "spendwise-data-v1";

const state = loadState();

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

function loadState() {
  const saved = localStorage.getItem(storeKey);

  if (saved) {
    return JSON.parse(saved);
  }

  return {
    transactions: [],
    bills: [],
    repayments: [],
  };
}

function saveAndRender() {
  localStorage.setItem(storeKey, JSON.stringify(state));
  render();
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
  renderCategoryBars();
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

            <button class="small-button" onclick="toggleBill('${bill.id}')">
              ${bill.status === "paid" ? "Mark unpaid" : "Mark paid"}
            </button>
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

function renderCategoryBars() {
  const container = document.getElementById("categoryBars");
  const categories = categoryTotals();
  const max = Math.max(...categories.map((item) => item.total), 0);
  const largest = categories[0];

  setText(
    "largestCategory",
    largest ? `Highest: ${largest.category}` : "No spending yet"
  );

  if (categories.length === 0) {
    container.innerHTML = empty("Add expenses to see category analysis.");
    return;
  }

  container.innerHTML = categories
    .map((item) => {
      return `
        <div class="bar-row">
          <div class="bar-meta">
            <strong>${item.category}</strong>
            <span>${money.format(item.total)}</span>
          </div>

          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.max((item.total / max) * 100, 8)}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
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

render();
