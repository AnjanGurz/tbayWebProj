// Initialize data structure in local storage if it doesn't exist
class AdvancedWorkTracker {
  constructor() {
    this.currentWorkplace = null
    this.timerInterval = null
    this.startTime = null
    this.elapsedTime = 0
    this.isRunning = false
    this.currentDate = new Date()

    this.initializeStorage()
    this.bindEvents()
    this.loadCategories()
    this.updatePeriodInfo()
    this.loadDailyView()
    this.loadReports()

    // Set default date
    document.getElementById("manualDate").valueAsDate = new Date()
  }

  initializeStorage() {
    // Initialize default data structures
    if (!localStorage.getItem("workEntries")) {
      localStorage.setItem("workEntries", JSON.stringify([]))
    }

    if (!localStorage.getItem("workCategories")) {
      const defaultCategories = [
        {
          id: 1,
          name: "Restaurant Server",
          rate: 15.0,
          icon: "fas fa-utensils",
          color: "yellow",
        },
        {
          id: 2,
          name: "House Cleaning",
          rate: 20.0,
          icon: "fas fa-broom",
          color: "blue",
        },
      ]
      localStorage.setItem("workCategories", JSON.stringify(defaultCategories))
    }

    if (!localStorage.getItem("periodSettings")) {
      const defaultPeriod = {
        startDate: this.getLastSunday().toISOString().split("T")[0],
        length: 14, // bi-weekly
      }
      localStorage.setItem("periodSettings", JSON.stringify(defaultPeriod))
    }
  }

  getLastSunday() {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day
    return new Date(today.setDate(diff))
  }

  bindEvents() {
    // Navigation
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.switchTab(e.target.closest(".nav-btn").dataset.tab))
    })

    // Timer controls
    document.getElementById("startBtn").addEventListener("click", () => this.startTimer())
    document.getElementById("pauseBtn").addEventListener("click", () => this.pauseTimer())
    document.getElementById("stopBtn").addEventListener("click", () => this.stopTimer())

    // Forms
    document.getElementById("manualForm").addEventListener("submit", (e) => this.submitManualEntry(e))
    document.getElementById("addCategory").addEventListener("click", () => this.addCategory())
    document.getElementById("savePeriodSettings").addEventListener("click", () => this.savePeriodSettings())

    // Daily navigation
    document.getElementById("prevDay").addEventListener("click", () => this.changeDay(-1))
    document.getElementById("nextDay").addEventListener("click", () => this.changeDay(1))

    // Reports
    document.getElementById("reportPeriod").addEventListener("change", (e) => this.changeReportPeriod(e.target.value))
    document.getElementById("generateCustomReport").addEventListener("click", () => this.generateCustomReport())
    document.getElementById("exportBtn").addEventListener("click", () => this.exportReport())

    // Modal
    document.getElementById("closeModal").addEventListener("click", () => this.closeModal())
    document.getElementById("printBtn").addEventListener("click", () => this.printReport())
    document.getElementById("screenshotBtn").addEventListener("click", () => this.takeScreenshot())
  }

  switchTab(tabName) {
    // Update navigation
    document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.remove("active"))
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active")

    // Update content
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"))
    document.getElementById(`${tabName}-tab`).classList.add("active")

    // Refresh data based on tab
    if (tabName === "daily") this.loadDailyView()
    if (tabName === "reports") this.loadReports()
    if (tabName === "settings") this.loadSettings()
  }

  loadCategories() {
    const categories = JSON.parse(localStorage.getItem("workCategories"))
    const categoryGrid = document.getElementById("categoryGrid")
    const manualCategory = document.getElementById("manualCategory")

    // Clear existing content
    categoryGrid.innerHTML = ""
    manualCategory.innerHTML = '<option value="">Select category</option>'

    categories.forEach((category) => {
      // Add to grid
      const categoryCard = document.createElement("div")
      categoryCard.className = `category-card ${category.color}`
      categoryCard.dataset.categoryId = category.id
      categoryCard.innerHTML = `
        <i class="category-icon ${category.icon}"></i>
        <span class="category-name">${category.name}</span>
        <span class="category-rate">$${category.rate}/hr</span>
      `
      categoryCard.addEventListener("click", () => this.selectCategory(category))
      categoryGrid.appendChild(categoryCard)

      // Add to manual form
      const option = document.createElement("option")
      option.value = category.id
      option.textContent = category.name
      manualCategory.appendChild(option)
    })

    this.loadCategoriesList()
  }

  loadCategoriesList() {
    const categories = JSON.parse(localStorage.getItem("workCategories"))
    const categoriesList = document.getElementById("categoriesList")

    categoriesList.innerHTML = categories
      .map(
        (category) => `
    <div class="category-item ${category.color}">
      <div class="category-item-info">
        <i class="category-item-icon ${category.icon}"></i>
        <div class="category-item-details">
          <h4>${category.name}</h4>
          <span>$${category.rate}/hr</span>
        </div>
      </div>
      <button class="delete-category-btn" data-category-id="${category.id}">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `,
      )
      .join("")

  // Add event listeners for delete buttons
  document.querySelectorAll('.delete-category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const categoryId = parseInt(e.target.closest('.delete-category-btn').dataset.categoryId)
      this.deleteCategory(categoryId)
    })
  })
}

  selectCategory(category) {
    this.currentCategory = category

    // Show timer section
    const timerSection = document.getElementById("timerSection")
    const timerCategoryIcon = document.getElementById("timerCategoryIcon")
    const timerCategoryName = document.getElementById("timerCategoryName")
    const timerCategoryRate = document.getElementById("timerCategoryRate")

    timerCategoryIcon.className = `category-icon ${category.icon}`
    timerCategoryName.textContent = category.name
    timerCategoryRate.textContent = `$${category.rate}/hr`

    // Show with animation
    timerSection.style.display = "block"
    timerSection.style.opacity = "0"
    timerSection.style.transform = "translateY(20px)"

    setTimeout(() => {
      timerSection.style.transition = "all 0.3s ease"
      timerSection.style.opacity = "1"
      timerSection.style.transform = "translateY(0)"
    }, 50)

    // Add visual feedback
    document.querySelectorAll(".category-card").forEach((card) => card.classList.remove("active"))
    document.querySelector(`[data-category-id="${category.id}"]`).classList.add("active")
  }

  startTimer() {
    if (!this.isRunning) {
      this.isRunning = true
      this.startTime = Date.now() - this.elapsedTime

      this.timerInterval = setInterval(() => {
        this.elapsedTime = Date.now() - this.startTime
        this.updateTimerDisplay()
      }, 1000)

      // Update UI
      document.getElementById("startBtn").style.display = "none"
      document.getElementById("pauseBtn").style.display = "flex"
      document.getElementById("stopBtn").style.display = "flex"
    }
  }

  pauseTimer() {
    if (this.isRunning) {
      this.isRunning = false
      clearInterval(this.timerInterval)

      // Update UI
      document.getElementById("startBtn").style.display = "flex"
      document.getElementById("pauseBtn").style.display = "none"
    }
  }

  stopTimer() {
    const totalHours = this.elapsedTime / (1000 * 60 * 60)

    if (totalHours < 0.017) { // At least 1 minute
      this.showToast("Timer must run for at least 1 minute!", "error")
      return
    }

    // Create entry
    const entry = {
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      categoryId: this.currentCategory.id,
      categoryName: this.currentCategory.name,
      hoursWorked: Math.round(totalHours * 100) / 100,
      startTime: new Date(this.startTime).toTimeString().slice(0, 5),
      endTime: new Date().toTimeString().slice(0, 5),
      earnings: Math.round(totalHours * this.currentCategory.rate * 100) / 100,
      notes: "Timer entry",
      isTimer: true,
    }

    this.saveEntry(entry)
    this.resetTimer()
    this.showToast(`Work session saved! Earned $${entry.earnings.toFixed(2)}`)
    
    // Switch to daily tab to show the new entry
    this.switchTab('daily')
  }

  updateTimerDisplay() {
    const hours = Math.floor(this.elapsedTime / (1000 * 60 * 60))
    const minutes = Math.floor((this.elapsedTime % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((this.elapsedTime % (1000 * 60)) / 1000)

    const display = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    document.getElementById("timerDisplay").textContent = display

    // Update earnings
    const totalHours = this.elapsedTime / (1000 * 60 * 60)
    const earnings = totalHours * this.currentCategory.rate
    document.getElementById("timerEarnings").textContent = `$${earnings.toFixed(2)}`
  }

  resetTimer() {
    this.isRunning = false
    this.elapsedTime = 0
    clearInterval(this.timerInterval)

    // Reset UI
    document.getElementById("startBtn").style.display = "flex"
    document.getElementById("pauseBtn").style.display = "none"
    document.getElementById("stopBtn").style.display = "none"
    document.getElementById("timerDisplay").textContent = "00:00:00"
    document.getElementById("timerEarnings").textContent = "$0.00"
    document.getElementById("timerSection").style.display = "none"

    // Remove active category
    document.querySelectorAll(".category-card").forEach((card) => card.classList.remove("active"))
    this.currentCategory = null
  }

  submitManualEntry(e) {
    e.preventDefault()

    const date = document.getElementById("manualDate").value
    const categoryId = Number.parseInt(document.getElementById("manualCategory").value)
    const startTime = document.getElementById("manualStart").value
    const endTime = document.getElementById("manualEnd").value
    const notes = document.getElementById("manualNotes").value

    if (startTime >= endTime) {
      this.showToast("End time must be after start time!", "error")
      return
    }

    const categories = JSON.parse(localStorage.getItem("workCategories"))
    const category = categories.find((c) => c.id === categoryId)

    // Calculate hours
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    const hoursWorked = Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100

    const entry = {
      id: Date.now(),
      date,
      categoryId,
      categoryName: category.name,
      startTime,
      endTime,
      hoursWorked,
      earnings: Math.round(hoursWorked * category.rate * 100) / 100,
      notes,
      isTimer: false,
    }

    this.saveEntry(entry)
    e.target.reset()
    document.getElementById("manualDate").valueAsDate = new Date()
    this.showToast(`Entry saved! Earned $${entry.earnings.toFixed(2)}`)
  }

  saveEntry(entry) {
    const entries = JSON.parse(localStorage.getItem("workEntries"))
    entries.push(entry)
    localStorage.setItem("workEntries", JSON.stringify(entries))

    this.updatePeriodInfo()
    this.loadDailyView()
    this.loadReports()
  }

  addCategory() {
    const name = document.getElementById("categoryName").value
    const rate = Number.parseFloat(document.getElementById("categoryRate").value)
    const icon = document.getElementById("categoryIcon").value
    const color = document.getElementById("categoryColor").value

    if (!name || !rate) {
      this.showToast("Please fill in all required fields!", "error")
      return
    }

    const categories = JSON.parse(localStorage.getItem("workCategories"))
    const newCategory = {
      id: Date.now(),
      name,
      rate,
      icon,
      color,
    }

    categories.push(newCategory)
    localStorage.setItem("workCategories", JSON.stringify(categories))

    // Reset form
    document.getElementById("categoryName").value = ""
    document.getElementById("categoryRate").value = ""

    this.loadCategories()
    this.showToast("Category added successfully!")
  }

  deleteCategory(id) {
    if (confirm("Are you sure you want to delete this category?")) {
      const categories = JSON.parse(localStorage.getItem("workCategories"))
      const updatedCategories = categories.filter((category) => category.id !== id)
      localStorage.setItem("workCategories", JSON.stringify(updatedCategories))

      this.loadCategories()
      this.showToast("Category deleted!")
    }
  }

  savePeriodSettings() {
    const startDate = document.getElementById("periodStartDate").value
    const length = Number.parseInt(document.getElementById("periodLength").value)

    if (!startDate) {
      this.showToast("Please select a start date!", "error")
      return
    }

    const periodSettings = { startDate, length }
    localStorage.setItem("periodSettings", JSON.stringify(periodSettings))

    this.updatePeriodInfo()
    this.showToast("Period settings saved!")
  }

  updatePeriodInfo() {
    const periodSettings = JSON.parse(localStorage.getItem("periodSettings"))
    const entries = JSON.parse(localStorage.getItem("workEntries"))

    const startDate = new Date(periodSettings.startDate)
    const today = new Date()

    // Calculate current period
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24))
    const currentPeriodNumber = Math.floor(daysSinceStart / periodSettings.length) + 1
    const daysIntoPeriod = daysSinceStart % periodSettings.length
    const daysRemaining = periodSettings.length - daysIntoPeriod

    // Calculate current period dates
    const currentPeriodStart = new Date(startDate)
    currentPeriodStart.setDate(startDate.getDate() + (currentPeriodNumber - 1) * periodSettings.length)

    const currentPeriodEnd = new Date(currentPeriodStart)
    currentPeriodEnd.setDate(currentPeriodStart.getDate() + periodSettings.length - 1)

    // Filter entries for current period
    const currentPeriodEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.date)
      return entryDate >= currentPeriodStart && entryDate <= currentPeriodEnd
    })

    const totalHours = currentPeriodEntries.reduce((sum, entry) => sum + entry.hoursWorked, 0)

    // Update UI
    document.getElementById("currentPeriodLabel").textContent = `Period ${currentPeriodNumber}`
    document.getElementById("currentPeriodHours").textContent = `${totalHours.toFixed(1)}h`
    document.getElementById("progressText").textContent = `${daysRemaining} days remaining`

    // Update progress bar
    const progress = (daysIntoPeriod / periodSettings.length) * 100
    document.getElementById("periodProgress").style.width = `${progress}%`
  }

  loadDailyView() {
    const entries = JSON.parse(localStorage.getItem("workEntries"))
    const dateStr = this.currentDate.toISOString().split("T")[0]

    // Update current date display
    document.getElementById("currentDate").textContent = this.formatDate(this.currentDate)

    // Filter entries for current date
    const dailyEntries = entries.filter((entry) => entry.date === dateStr)

    // Calculate daily summary
    const totalHours = dailyEntries.reduce((sum, entry) => sum + entry.hoursWorked, 0)
    const totalEarnings = dailyEntries.reduce((sum, entry) => sum + entry.earnings, 0)
    const sessionsCount = dailyEntries.length

    // Update daily summary
    document.getElementById("dailySummary").innerHTML = `
    <div class="summary-stats">
      <div class="stat-item">
        <span class="stat-value">${totalHours.toFixed(1)}</span>
        <span class="stat-label">Hours</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${sessionsCount}</span>
        <span class="stat-label">Sessions</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">$${totalEarnings.toFixed(2)}</span>
        <span class="stat-label">Earnings</span>
      </div>
    </div>
  `

    // Update daily entries
    const dailyEntriesContainer = document.getElementById("dailyEntries")
    if (dailyEntries.length === 0) {
      dailyEntriesContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-day" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem; color: var(--primary-yellow);"></i>
        <p>No entries for this date</p>
        <p style="font-size: 0.9rem; opacity: 0.7;">Start tracking to see your work sessions here</p>
      </div>
    `
    } else {
      dailyEntriesContainer.innerHTML = dailyEntries
        .sort((a, b) => b.startTime.localeCompare(a.startTime))
        .map(
          (entry) => `
      <div class="entry-card slide-in">
        <div class="entry-header">
          <div class="entry-category">
            <i class="${this.getCategoryIcon(entry.categoryId)}"></i>
            <strong>${entry.categoryName}</strong>
          </div>
          <div class="entry-earnings">$${entry.earnings.toFixed(2)}</div>
        </div>
        <div class="entry-details">
          <span><i class="fas fa-clock"></i> ${entry.startTime} - ${entry.endTime}</span>
          <span><i class="fas fa-hourglass-half"></i> ${entry.hoursWorked}h</span>
        </div>
        ${entry.notes && entry.notes !== 'Timer entry' ? `<div class="entry-notes"><i class="fas fa-sticky-note"></i> ${entry.notes}</div>` : ""}
        <div class="entry-type">
          <span class="entry-badge ${entry.isTimer ? 'timer-badge' : 'manual-badge'}">
            <i class="fas fa-${entry.isTimer ? 'stopwatch' : 'edit'}"></i>
            ${entry.isTimer ? 'Timer' : 'Manual'}
          </span>
        </div>
      </div>
    `,
        )
        .join("")
    }
  }

  changeDay(direction) {
    this.currentDate.setDate(this.currentDate.getDate() + direction)
    this.loadDailyView()
  }

  loadReports() {
    const reportPeriod = document.getElementById("reportPeriod").value
    this.generateReport(reportPeriod)
  }

  changeReportPeriod(period) {
    if (period === "custom") {
      document.getElementById("customRange").style.display = "block"
    } else {
      document.getElementById("customRange").style.display = "none"
      this.generateReport(period)
    }
  }

  generateCustomReport() {
    const fromDate = document.getElementById("customFromDate").value
    const toDate = document.getElementById("customToDate").value

    if (!fromDate || !toDate) {
      this.showToast("Please select both dates!", "error")
      return
    }

    if (fromDate > toDate) {
      this.showToast("From date must be before to date!", "error")
      return
    }

    this.generateReport("custom", fromDate, toDate)
  }

  generateReport(period, customFrom = null, customTo = null) {
    const entries = JSON.parse(localStorage.getItem("workEntries"))
    const categories = JSON.parse(localStorage.getItem("workCategories"))
    const periodSettings = JSON.parse(localStorage.getItem("periodSettings"))

    let filteredEntries = []
    let periodLabel = ""

    if (period === "custom") {
      filteredEntries = entries.filter((entry) => entry.date >= customFrom && entry.date <= customTo)
      periodLabel = `${this.formatDate(new Date(customFrom))} - ${this.formatDate(new Date(customTo))}`
    } else {
      // Calculate period dates
      const startDate = new Date(periodSettings.startDate)
      const today = new Date()
      const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24))
      const currentPeriodNumber = Math.floor(daysSinceStart / periodSettings.length) + 1

      let periodStart, periodEnd

      if (period === "current") {
        periodStart = new Date(startDate)
        periodStart.setDate(startDate.getDate() + (currentPeriodNumber - 1) * periodSettings.length)
        periodEnd = new Date(periodStart)
        periodEnd.setDate(periodStart.getDate() + periodSettings.length - 1)
        periodLabel = `Period ${currentPeriodNumber} (Current)`
      } else if (period === "previous") {
        periodStart = new Date(startDate)
        periodStart.setDate(startDate.getDate() + (currentPeriodNumber - 2) * periodSettings.length)
        periodEnd = new Date(periodStart)
        periodEnd.setDate(periodStart.getDate() + periodSettings.length - 1)
        periodLabel = `Period ${currentPeriodNumber - 1} (Previous)`
      }

      filteredEntries = entries.filter((entry) => {
        const entryDate = new Date(entry.date)
        return entryDate >= periodStart && entryDate <= periodEnd
      })
    }

    // Calculate summary
    const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.hoursWorked, 0)
    const totalEarnings = filteredEntries.reduce((sum, entry) => sum + entry.earnings, 0)
    const totalSessions = filteredEntries.length

    // Group by category
    const categoryStats = {}
    filteredEntries.forEach((entry) => {
      if (!categoryStats[entry.categoryName]) {
        categoryStats[entry.categoryName] = {
          hours: 0,
          earnings: 0,
          sessions: 0,
        }
      }
      categoryStats[entry.categoryName].hours += entry.hoursWorked
      categoryStats[entry.categoryName].earnings += entry.earnings
      categoryStats[entry.categoryName].sessions += 1
    })

    // Generate report HTML
    const reportHTML = `
    <div class="report-header">
      <h1 class="report-title">WorkTimeTracker</h1>
      <p class="report-subtitle">by Anjan</p>
      <p class="report-period">${periodLabel}</p>
      <p class="report-generated">Generated on ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="report-summary">
      <div class="summary-card">
        <div class="summary-value">${totalHours.toFixed(1)}</div>
        <div class="summary-label">Total Hours</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${totalSessions}</div>
        <div class="summary-label">Total Sessions</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">$${totalEarnings.toFixed(2)}</div>
        <div class="summary-label">Total Earnings</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">$${totalSessions > 0 ? (totalEarnings / totalHours).toFixed(2) : "0.00"}</div>
        <div class="summary-label">Avg Rate</div>
      </div>
    </div>

      <h3>Category Breakdown</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Hours</th>
            <th>Sessions</th>
            <th>Earnings</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(categoryStats)
            .map(
              ([category, stats]) => `
            <tr>
              <td>${category}</td>
              <td>${stats.hours.toFixed(1)}</td>
              <td>${stats.sessions}</td>
              <td>$${stats.earnings.toFixed(2)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <h3>Detailed Entries</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Time</th>
            <th>Hours</th>
            <th>Earnings</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${filteredEntries
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(
              (entry) => `
            <tr>
              <td>${this.formatDate(new Date(entry.date))}</td>
              <td>${entry.categoryName}</td>
              <td>${entry.startTime} - ${entry.endTime}</td>
              <td>${entry.hoursWorked.toFixed(1)}</td>
              <td>$${entry.earnings.toFixed(2)}</td>
              <td>${entry.notes || "-"}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `

    document.getElementById("reportContainer").innerHTML = reportHTML
  }

  exportReport() {
    const reportHTML = document.getElementById("reportContainer").innerHTML
    document.getElementById("printPreview").innerHTML = reportHTML
    document.getElementById("printModal").classList.add("show")
  }

  closeModal() {
    document.getElementById("printModal").classList.remove("show")
  }

  printReport() {
    window.print()
  }

  takeScreenshot() {
    // This would require a library like html2canvas for actual screenshot functionality
    // For now, we'll just show a message
    this.showToast("Screenshot feature requires additional setup. Use browser's print to PDF instead.")
  }

  loadSettings() {
    const periodSettings = JSON.parse(localStorage.getItem("periodSettings"))

    // Load period settings
    document.getElementById("periodStartDate").value = periodSettings.startDate
    document.getElementById("periodLength").value = periodSettings.length
  }

  formatDate(date) {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString()
    }
  }

  showToast(message, type = "success") {
    const toast = document.getElementById("toast")
    const toastMessage = document.getElementById("toastMessage")

    toastMessage.textContent = message

    if (type === "error") {
      toast.style.background = "var(--error)"
      toast.querySelector("i").className = "fas fa-exclamation-circle"
    } else {
      toast.style.background = "var(--gradient-primary)"
      toast.querySelector("i").className = "fas fa-check-circle"
    }

    toast.classList.add("show")

    setTimeout(() => {
      toast.classList.remove("show")
    }, 3000)
  }

  getCategoryIcon(categoryId) {
    const categories = JSON.parse(localStorage.getItem("workCategories"))
    const category = categories.find(c => c.id === categoryId)
    return category ? category.icon : 'fas fa-briefcase'
  }
}

// Initialize app
const app = new AdvancedWorkTracker()

// Add touch interactions for mobile
document.addEventListener("touchstart", (e) => {
  if (e.target.classList.contains("category-card") || e.target.classList.contains("timer-btn")) {
    e.target.style.transform = "scale(0.95)"
  }
})

document.addEventListener("touchend", (e) => {
  if (e.target.classList.contains("category-card") || e.target.classList.contains("timer-btn")) {
    setTimeout(() => {
      e.target.style.transform = ""
    }, 150)
  }
})

// Prevent zoom on double tap for better mobile experience
let lastTouchEnd = 0
document.addEventListener(
  "touchend",
  (event) => {
    const now = new Date().getTime()
    if (now - lastTouchEnd <= 300) {
      event.preventDefault()
    }
    lastTouchEnd = now
  },
  false,
)
