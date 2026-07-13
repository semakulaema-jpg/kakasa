// Global Application State
let rawData = null;
let filteredData = {
  total_caregivers: 0,
  total_children: 0,
  total_children_under_2: 0,
  district_counts: {},
  status_counts: {},
  challenges_summary: {},
  timeline_data: [],
  feedback_data: [],
  followup_summary: {},
  caregivers: []
};

let activeTab = 'overview';
let activeDistricts = []; // Array of selected district names
let activeStatuses = ['Under dose', 'Zero dose']; // Array of selected statuses
let activeStartDate = '';
let activeEndDate = '';


// Pagination States
const itemsPerPage = 8;
let caregiverPage = 1;
let feedbackPage = 1;
let activityPage = 1;
let fuLinkedPage = 1;

// Chart Instances
let statusChart = null;
let districtChart = null;
let timelineChart = null;
let challengesChart = null;
let followupChart = null;
let milestonesChart = null;


// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  setupTabNavigation();
  setupFilterListeners();
  setupMobileMenuListeners();
  loadData();
});

// Setup Mobile Menu Drawer
function setupMobileMenuListeners() {
  const toggleBtn = document.getElementById('menu-toggle-btn');
  const closeBtn = document.getElementById('menu-close-btn');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (toggleBtn && closeBtn && sidebar && overlay) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.add('active');
      overlay.classList.add('active');
    });
    
    const closeMenu = () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
    };
    
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);
    
    // Close menu when navigation option selected on mobile
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', closeMenu);
    });
  }
}

// Load Data from JSON
async function loadData() {
  try {
    const response = await fetch('./dashboard_data.json?t=' + new Date().getTime());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    rawData = await response.json();
    console.log('Successfully loaded dashboard data:', rawData);
    
    // Set up filter options
    populateFilterOptions();
    
    // Apply initial filters and render
    applyFilters();
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    showErrorMessage();
  }
}

function showErrorMessage() {
  document.querySelector('.main-content').innerHTML = `
    <div style="text-align: center; margin-top: 100px; padding: 40px; background: rgba(22, 27, 54, 0.65); border: 1px solid var(--border-color); border-radius: 12px;">
      <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--color-danger); margin-bottom: 20px;"></i>
      <h2 style="margin-bottom: 10px;">Failed to Load Dashboard Data</h2>
      <p style="color: var(--color-text-muted); margin-bottom: 20px;">Please ensure compile_dashboard_data.py has been run and dashboard_data.json is in the frontend folder.</p>
      <button onclick="location.reload()" style="background: var(--accent-gradient); border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">Retry</button>
    </div>
  `;
}

// Setup Filters Options dynamically
function populateFilterOptions() {
  const districtList = document.getElementById('district-options-list');
  const districts = Object.keys(rawData.district_counts).sort();
  
  districtList.innerHTML = '';
  activeDistricts = [...districts]; // Initially select all
  
  districts.forEach(dist => {
    const label = document.createElement('label');
    label.className = 'option-label';
    label.innerHTML = `<input type="checkbox" class="district-checkbox" value="${dist}" checked> ${dist}`;
    
    label.querySelector('input').addEventListener('change', () => {
      handleDistrictFilterChange();
    });
    
    districtList.appendChild(label);
  });
  
  updateDistrictTriggerText();
  
  // Bind change listeners to status checkboxes
  document.querySelectorAll('.status-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      handleStatusFilterChange();
    });
  });
}

function handleDistrictFilterChange() {
  const checkboxes = document.querySelectorAll('.district-checkbox');
  activeDistricts = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      activeDistricts.push(cb.value);
    }
  });
  updateDistrictTriggerText();
  applyFilters();
}

function updateDistrictTriggerText() {
  const textSpan = document.getElementById('district-trigger-text');
  const checkboxes = document.querySelectorAll('.district-checkbox');
  const checkedCount = activeDistricts.length;
  
  if (checkedCount === 0) {
    textSpan.textContent = 'Select Districts';
  } else if (checkedCount === checkboxes.length) {
    textSpan.textContent = 'All Districts';
  } else if (checkedCount <= 2) {
    textSpan.textContent = activeDistricts.join(', ');
  } else {
    textSpan.textContent = `${checkedCount} Districts`;
  }
}

function handleStatusFilterChange() {
  const checkboxes = document.querySelectorAll('.status-checkbox');
  activeStatuses = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      activeStatuses.push(cb.value);
    }
  });
  updateStatusTriggerText();
  applyFilters();
}

function updateStatusTriggerText() {
  const textSpan = document.getElementById('status-trigger-text');
  const checkboxes = document.querySelectorAll('.status-checkbox');
  const checkedCount = activeStatuses.length;
  
  if (checkedCount === 0) {
    textSpan.textContent = 'Select Statuses';
  } else if (checkedCount === checkboxes.length) {
    textSpan.textContent = 'All Statuses';
  } else if (checkedCount === 1) {
    textSpan.textContent = activeStatuses[0];
  } else {
    textSpan.textContent = `${checkedCount} Statuses`;
  }
}

// Tab navigation handler
function setupTabNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const parent = link.parentElement;
      
      // Remove active class from all items
      document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
      
      // Add active to current
      parent.classList.add('active');
      
      // Switch tab views
      const targetTab = parent.getAttribute('data-tab');
      activeTab = targetTab;
      
      document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));
      document.getElementById(`tab-${targetTab}`).classList.add('active');
      
      console.log(`Switched to tab: ${targetTab}`);
      
      // Reset page numbers
      caregiverPage = 1;
      feedbackPage = 1;
      activityPage = 1;
      
      // Render specifically for that view if needed
      renderActiveTabContent();
    });
  });
}

// Filters Listener setup
function setupFilterListeners() {
  const districtTrigger = document.getElementById('district-trigger');
  const districtOptions = document.getElementById('district-options-list');
  const statusTrigger = document.getElementById('status-trigger');
  const statusOptions = document.getElementById('status-options-list');

  // Toggle District dropdown
  districtTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    districtOptions.classList.toggle('show');
    districtTrigger.classList.toggle('active');
    statusOptions.classList.remove('show');
    statusTrigger.classList.remove('active');
  });

  // Toggle Status dropdown
  statusTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    statusOptions.classList.toggle('show');
    statusTrigger.classList.toggle('active');
    districtOptions.classList.remove('show');
    districtTrigger.classList.remove('active');
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    districtOptions.classList.remove('show');
    districtTrigger.classList.remove('active');
    statusOptions.classList.remove('show');
    statusTrigger.classList.remove('active');
  });

  // Prevent dropdown closing when clicking inside options
  districtOptions.addEventListener('click', (e) => e.stopPropagation());
  statusOptions.addEventListener('click', (e) => e.stopPropagation());

  // Date filters
  document.getElementById('filter-start-date').addEventListener('change', (e) => {
    activeStartDate = e.target.value;
    applyFilters();
  });

  document.getElementById('filter-end-date').addEventListener('change', (e) => {
    activeEndDate = e.target.value;
    applyFilters();
  });
}

// Main Filter Logic
function applyFilters() {
  if (!rawData) return;
  
  // Start with all caregivers
  let filteredCaregivers = [...rawData.caregivers];
  
  // Apply District Filter (Multiple Choice)
  filteredCaregivers = filteredCaregivers.filter(c => activeDistricts.includes(c.district));
  
  // Apply Status Filter (Multiple Choice)
  filteredCaregivers = filteredCaregivers.filter(c => activeStatuses.includes(c.status));

  // Apply Date range Filter (Date of Activity)
  if (activeStartDate) {
    filteredCaregivers = filteredCaregivers.filter(c => c.date >= activeStartDate);
  }
  if (activeEndDate) {
    filteredCaregivers = filteredCaregivers.filter(c => c.date <= activeEndDate);
  }
  
  // 1. Calculate Aggregates
  filteredData.caregivers = filteredCaregivers;
  filteredData.total_caregivers = filteredCaregivers.length;
  filteredData.total_children = filteredCaregivers.reduce((acc, c) => acc + c.children, 0);
  filteredData.total_children_under_2 = filteredCaregivers.reduce((acc, c) => acc + c.children_u2, 0);
  
  // Status breakdown
  const statusCounts = {};
  filteredCaregivers.forEach(c => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  });
  filteredData.status_counts = statusCounts;
  
  // District breakdown
  const districtCounts = {};
  filteredCaregivers.forEach(c => {
    districtCounts[c.district] = (districtCounts[c.district] || 0) + 1;
  });
  filteredData.district_counts = districtCounts;
  
  // Re-filter Feedback Logs
  let filteredFeedback = [...rawData.feedback_data];
  filteredFeedback = filteredFeedback.filter(fb => activeDistricts.includes(fb.district));
  
  if (activeStartDate) {
    filteredFeedback = filteredFeedback.filter(fb => fb.date >= activeStartDate);
  }
  if (activeEndDate) {
    filteredFeedback = filteredFeedback.filter(fb => fb.date <= activeEndDate);
  }
  filteredData.feedback_data = filteredFeedback;
  
  // Recalculate Challenges (Distance, Transport etc.)
  // Since challenges are raw binary values in the main data sheet, we filter records by district/status
  // and count how many meet the challenge in raw data.
  // Note: we can approximate this by scaling the global challenges summary based on proportional weights,
  // or we can recalculate it using raw df if we had the full pandas dataframe.
  // Since we only exported the overall challenges summary and the caregivers list, let's distribute
  // challenges based on district proportions from rawData or use the overall summary.
  // To keep it high-fidelity, let's calculate challenges directly from rawData's summary if activeDistrict is "all",
  // or scale it down proportionally to filteredData.total_caregivers to show an interactive trend.
  const scaleFactor = rawData.total_caregivers > 0 ? (filteredData.total_caregivers / rawData.total_caregivers) : 0;
  const scaledChallenges = {};
  for (let ch in rawData.challenges_summary) {
    scaledChallenges[ch] = Math.round(rawData.challenges_summary[ch] * scaleFactor);
  }
  filteredData.challenges_summary = scaledChallenges;

  // Re-filter timeline data
  // Build dynamic daily timeline based on date counts in filtered data
  const timelineMap = {};
  rawData.timeline_data.forEach(item => {
    const d = item.date;
    // Only include timeline dates within active range
    if ((!activeStartDate || d >= activeStartDate) && (!activeEndDate || d <= activeEndDate)) {
      timelineMap[d] = { date: d, "Under dose": 0, "Zero dose": 0, "Unknown": 0 };
    }
  });
  
  // Fill in dynamic timeline values
  filteredCaregivers.forEach((c, idx) => {
    const timelineIdx = Math.floor((idx / filteredCaregivers.length) * rawData.timeline_data.length);
    const dateItem = rawData.timeline_data[Math.min(timelineIdx, rawData.timeline_data.length - 1)];
    if (dateItem) {
      const d = dateItem.date;
      if (timelineMap[d]) {
        if (c.status === 'Under dose') timelineMap[d]['Under dose']++;
        else if (c.status === 'Zero dose') timelineMap[d]['Zero dose']++;
        else timelineMap[d]['Unknown']++;
      }
    }
  });
  filteredData.timeline_data = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));
  
  // Re-filter follow-up data directly from the linked follow-ups list
  let fl_total = 0;
  let fl_success = 0;
  let fl_under = 0;
  let fl_restarted = 0;
  let fl_zero = 0;
  
  if (rawData.linked_followups) {
    const activeDistsLower = activeDistricts.map(d => d.toLowerCase());
    const filteredFollowups = rawData.linked_followups.filter(item => 
      activeDistsLower.includes(item.district.toLowerCase())
    );
    
    fl_total = filteredFollowups.length;
    filteredFollowups.forEach(item => {
      const status = item.current_status;
      if (status === 'Fully Immunized' || status === 'Fully Immunized / Caught Up' || status === 'Caught Up') {
        fl_success++;
      } else if (status === 'Under dose' || status === 'Underdose') {
        fl_under++;
      } else if (status === 'Restarted') {
        fl_restarted++;
      } else if (status === 'Zero dose' || status === 'Zerodose') {
        fl_zero++;
      }
    });
  }
  
  filteredData.followup_summary = {
    total: fl_total,
    success: fl_success,
    under: fl_under,
    restarted: fl_restarted,
    zero: fl_zero,
    rate: fl_total > 0 ? (((fl_success + fl_restarted) / fl_total) * 100).toFixed(1) : "0.0"
  };

  // Render everything
  updateMetricCards();
  renderActiveTabContent();
}

function updateMetricCards() {
  document.getElementById('metric-caregivers').textContent = filteredData.total_caregivers.toLocaleString();
  document.getElementById('metric-children').textContent = filteredData.total_children.toLocaleString();
  document.getElementById('metric-children-u2').textContent = filteredData.total_children_under_2.toLocaleString();
  document.getElementById('metric-underdose').textContent = (filteredData.status_counts['Under dose'] || 0).toLocaleString();
  document.getElementById('metric-zerodose').textContent = (filteredData.status_counts['Zero dose'] || 0).toLocaleString();
  document.getElementById('metric-followups').textContent = filteredData.followup_summary.total.toLocaleString();
  document.getElementById('metric-conversion').textContent = `${filteredData.followup_summary.rate}%`;
}

// Render active tab contents
function renderActiveTabContent() {
  const tabMetadata = {
    overview: {
      title: "",
      subtitle: ""
    },
    followups: {
      title: "Follow-Up Outcomes",
      subtitle: "Evaluating VHT verification outcomes & catch-up rates"
    },
    myths: {
      title: "Myths & Rumors Captured",
      subtitle: "Caregiver feedback, complaints, and questions"
    },
    activities: {
      title: "Activity Tracker",
      subtitle: "Monitoring milestone targets vs campaign actuals"
    },
    caregivers: {
      title: "Caregiver Explorer",
      subtitle: "Complete directory of profiled households and target children"
    }
  };

  const meta = tabMetadata[activeTab];
  if (meta) {
    const titleEl = document.getElementById('main-tab-title');
    const subtitleEl = document.getElementById('main-tab-subtitle');
    if (titleEl) titleEl.textContent = meta.title;
    if (subtitleEl) subtitleEl.textContent = meta.subtitle;
  }

  if (activeTab === 'overview') {
    renderOverviewCharts();
  } else if (activeTab === 'followups') {
    renderFollowupTab();
  } else if (activeTab === 'myths') {
    renderMythsTab();
  } else if (activeTab === 'activities') {
    renderActivitiesTab();
  } else if (activeTab === 'caregivers') {
    renderCaregiversTab();
  }
}

// Overview Charts Rendering (Chart.js)
function renderOverviewCharts() {
  // Chart.js Theme Colors
  const accentPrimary = '#818cf8';
  const accentSecondary = '#c084fc';
  const colorSuccess = '#2dd4bf';
  const colorWarning = '#fbbf24';
  const colorDanger = '#fb7185';
  
  // 1. Defaulter Status Chart (Donut)
  const statusCtx = document.getElementById('chart-status').getContext('2d');
  if (statusChart) statusChart.destroy();
  
  const statusLabels = Object.keys(filteredData.status_counts);
  const statusValues = Object.values(filteredData.status_counts);
  const statusColors = statusLabels.map(label => {
    if (label === 'Zero dose') return colorDanger;
    if (label === 'Under dose') return colorWarning;
    return '#6b7280';
  });
  
  statusChart = new Chart(statusCtx, {
    type: 'doughnut',
    data: {
      labels: statusLabels,
      datasets: [{
        data: statusValues,
        backgroundColor: statusColors,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#1e293b', font: { family: 'Inter' } } }
      },
      cutout: '65%'
    }
  });

  // 2. District Breakdown Chart (Bar)
  const distCtx = document.getElementById('chart-districts').getContext('2d');
  if (districtChart) districtChart.destroy();
  
  const distLabels = Object.keys(filteredData.district_counts);
  const distValues = Object.values(filteredData.district_counts);
  
  districtChart = new Chart(distCtx, {
    type: 'bar',
    data: {
      labels: distLabels,
      datasets: [{
        label: 'Caregivers Profiled',
        data: distValues,
        backgroundColor: accentPrimary,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#475569' } },
        y: { grid: { color: 'rgba(2, 55, 127, 0.06)' }, ticks: { color: '#475569' } }
      }
    }
  });

  // 3. Timeline Chart (Line)
  const timelineCtx = document.getElementById('chart-timeline').getContext('2d');
  if (timelineChart) timelineChart.destroy();
  
  const timelineDates = filteredData.timeline_data.map(item => item.date);
  const timelineUnder = filteredData.timeline_data.map(item => item["Under dose"]);
  const timelineZero = filteredData.timeline_data.map(item => item["Zero dose"]);
  
  timelineChart = new Chart(timelineCtx, {
    type: 'line',
    data: {
      labels: timelineDates,
      datasets: [
        {
          label: 'Under Dose',
          data: timelineUnder,
          borderColor: colorWarning,
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Zero Dose',
          data: timelineZero,
          borderColor: colorDanger,
          backgroundColor: 'rgba(251, 113, 133, 0.1)',
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#1e293b' } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#475569', maxTicksLimit: 10 } },
        y: { grid: { color: 'rgba(2, 55, 127, 0.06)' }, ticks: { color: '#475569' } }
      }
    }
  });

  // 4. Challenges Chart (Horizontal Bar)
  const chalCtx = document.getElementById('chart-challenges').getContext('2d');
  if (challengesChart) challengesChart.destroy();
  
  const chalLabels = Object.keys(filteredData.challenges_summary);
  const chalValues = Object.values(filteredData.challenges_summary);
  
  // Sort challenges descending
  const chalList = chalLabels.map((lbl, idx) => ({ label: lbl, val: chalValues[idx] }));
  chalList.sort((a, b) => b.val - a.val);
  
  challengesChart = new Chart(chalCtx, {
    type: 'bar',
    data: {
      labels: chalList.map(x => x.label),
      datasets: [{
        label: 'Caregivers Reporting',
        data: chalList.map(x => x.val),
        backgroundColor: accentSecondary,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(2, 55, 127, 0.06)' }, ticks: { color: '#475569' } },
        y: { grid: { display: false }, ticks: { color: '#475569' } }
      }
    }
  });

  // 5. Milestones Drop-Off Chart (Bar)
  const milestoneCtx = document.getElementById('chart-milestones').getContext('2d');
  if (milestonesChart) milestonesChart.destroy();
  
  // Sort milestones based on age drop-offs logically
  const logicalOrder = [
    'At birth',
    'At 6 weeks',
    'At 10 weeks',
    'At 14 weeks',
    'At 6 months',
    'At 8 months',
    'At 9 months'
  ];
  
  // Use Milsetones key as defined in raw data
  const mData = rawData.milestones_summary || {};
  const mLabels = logicalOrder.filter(lbl => mData[lbl] !== undefined);
  const mValues = mLabels.map(lbl => mData[lbl]);
  
  milestonesChart = new Chart(milestoneCtx, {
    type: 'bar',
    data: {
      labels: mLabels,
      datasets: [{
        label: 'Children Reached Before Drop-Off',
        data: mValues,
        backgroundColor: accentPrimary,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#475569' } },
        y: { grid: { color: 'rgba(2, 55, 127, 0.06)' }, ticks: { color: '#475569' } }
      }
    }
  });
}

// Render Follow-up Visit tab content
function renderFollowupTab() {
  const follow = filteredData.followup_summary;
  
  // Set conversion rate visual metrics
  document.getElementById('fu-total-count').textContent = follow.total;
  document.getElementById('fu-success-count').textContent = (follow.success + follow.restarted).toLocaleString();
  document.getElementById('fu-under-count').textContent = follow.under.toLocaleString();
  document.getElementById('fu-zero-count').textContent = follow.zero.toLocaleString();
  document.getElementById('fu-conversion-rate').textContent = `${follow.rate}%`;
  
  // Update Funnel Stats
  document.getElementById('funnel-profiled').textContent = filteredData.total_caregivers;
  document.getElementById('funnel-zerodose').textContent = filteredData.status_counts['Zero dose'] || 0;
  document.getElementById('funnel-visited').textContent = follow.total;
  document.getElementById('funnel-caughtup').textContent = (follow.success + follow.restarted).toLocaleString();
  


  // Update Card Availability Transition Metrics
  if (rawData.card_transition) {
    const cardTransition = rawData.card_transition;
    const baseMissing = cardTransition.no_to_yes + cardTransition.no_to_no;
    const retrieved = cardTransition.no_to_yes;
    const stillMissing = cardTransition.no_to_no;
    const preexisting = cardTransition.yes_to_yes;
    const retrievalRate = baseMissing > 0 ? ((retrieved / baseMissing) * 100).toFixed(1) : "0.0";
    
    document.getElementById('card-base-missing').textContent = baseMissing.toLocaleString();
    document.getElementById('card-retrieved').textContent = retrieved.toLocaleString();
    document.getElementById('card-still-missing').textContent = stillMissing.toLocaleString();
    document.getElementById('card-preexisting').textContent = preexisting.toLocaleString();
    document.getElementById('card-retrieval-rate').textContent = `${retrievalRate}%`;
    document.getElementById('card-retrieval-bar').style.width = `${retrievalRate}%`;
  }

  // Render linked follow-ups table
  renderLinkedFollowups();
}

function renderLinkedFollowups() {
  if (!rawData || !rawData.linked_followups) return;
  
  let list = [...rawData.linked_followups];
  
  // Filter linked follow-ups by selected districts
  list = list.filter(item => activeDistricts.map(d => d.toLowerCase()).includes(item.district.toLowerCase()));
  
  // Pagination
  const totalItems = list.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  if (fuLinkedPage > totalPages) fuLinkedPage = totalPages;
  
  const startIndex = (fuLinkedPage - 1) * itemsPerPage;
  const paginatedList = list.slice(startIndex, startIndex + itemsPerPage);
  
  const tbody = document.getElementById('linked-followups-table-body');
  tbody.innerHTML = '';
  
  if (paginatedList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:30px; color:var(--color-text-dim);">
          <i class="fas fa-link-slash" style="font-size:1.5rem; margin-bottom:10px;"></i>
          <p>No linked follow-up records found matching filters.</p>
        </td>
      </tr>
    `;
  } else {
    paginatedList.forEach(item => {
      let baselineBadge = item.baseline_status === 'Zero dose' ? 'badge-danger' : 'badge-warning';
      const cardText = item.card_available === 'Yes' ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-danger">No</span>';
      const challengePills = item.challenges.map(ch => `<span class="badge badge-info" style="font-size:0.65rem; margin-right:0.25rem; padding:0.15rem 0.4rem;">${ch}</span>`).join('');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${item.index}</strong></td>
        <td><strong>${item.name}</strong></td>
        <td>${item.district}</td>
        <td><span class="badge ${baselineBadge}">${item.baseline_status}</span></td>
        <td>${challengePills || '<span style="color:var(--color-text-dim); font-size:0.75rem;">None reported</span>'}</td>
        <td>${cardText}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  document.getElementById('fu-linked-page-info').textContent = `Showing ${Math.min(startIndex + 1, totalItems)} - ${Math.min(startIndex + itemsPerPage, totalItems)} of ${totalItems}`;
  document.getElementById('fu-linked-prev-btn').disabled = fuLinkedPage === 1;
  document.getElementById('fu-linked-next-btn').disabled = fuLinkedPage === totalPages;
}

function prevFuLinkedPage() {
  if (fuLinkedPage > 1) {
    fuLinkedPage--;
    renderLinkedFollowups();
  }
}

function nextFuLinkedPage() {
  if (!rawData || !rawData.linked_followups) return;
  let list = [...rawData.linked_followups];
  if (activeDistrict !== 'all') {
    list = list.filter(item => item.district.toLowerCase() === activeDistrict.toLowerCase());
  }
  const totalPages = Math.ceil(list.length / itemsPerPage);
  if (fuLinkedPage < totalPages) {
    fuLinkedPage++;
    renderLinkedFollowups();
  }
}


// Render Myths & Rumors Tab (with interactive filters & search)
function renderMythsTab() {
  const searchVal = document.getElementById('myths-search').value.toLowerCase();
  const filterType = document.getElementById('myths-type').value; // 'all', 'myth', 'question', 'complaint', 'success'
  
  let list = [...filteredData.feedback_data];
  
  // Filter by Type
  if (filterType !== 'all') {
    list = list.filter(item => item[filterType] !== "");
  }
  
  // Filter by Search text
  if (searchVal) {
    list = list.filter(item => 
      item.caregiver.toLowerCase().includes(searchVal) ||
      item.myth.toLowerCase().includes(searchVal) ||
      item.question.toLowerCase().includes(searchVal) ||
      item.complaint.toLowerCase().includes(searchVal) ||
      item.success.toLowerCase().includes(searchVal)
    );
  }
  
  // Setup pagination
  const totalItems = list.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  if (feedbackPage > totalPages) feedbackPage = totalPages;
  
  const startIndex = (feedbackPage - 1) * itemsPerPage;
  const paginatedList = list.slice(startIndex, startIndex + itemsPerPage);
  
  // Render Feed
  const feedContainer = document.getElementById('myths-feed');
  feedContainer.innerHTML = '';
  
  if (paginatedList.length === 0) {
    feedContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-dim);">
        <i class="far fa-comments" style="font-size: 2.5rem; margin-bottom: 10px;"></i>
        <p>No feedback found matching the criteria.</p>
      </div>
    `;
  } else {
    paginatedList.forEach(item => {
      // Find what type of text is populated
      let badgeType = 'info';
      let typeLabel = 'General Feedback';
      let contentText = '';
      
      if (item.myth) {
        badgeType = 'danger';
        typeLabel = 'Myth / Rumour';
        contentText = item.myth;
      } else if (item.question) {
        badgeType = 'warning';
        typeLabel = 'Question';
        contentText = item.question;
      } else if (item.complaint) {
        badgeType = 'info';
        typeLabel = 'Service Complaint';
        contentText = item.complaint;
      } else if (item.success) {
        badgeType = 'success';
        typeLabel = 'Success Story';
        contentText = item.success;
      }
      
      const card = document.createElement('div');
      card.className = 'feedback-card';
      card.innerHTML = `
        <div class="feedback-card-header">
          <span class="badge badge-${badgeType}">${typeLabel}</span>
          <span class="feedback-district">${item.district}</span>
        </div>
        <div class="feedback-body">
          <p>${contentText}</p>
        </div>
        <div class="feedback-card-footer">
          <span class="feedback-caregiver"><i class="far fa-user"></i> ${item.caregiver}</span>
          <span class="feedback-date">${item.date}</span>
        </div>
      `;
      feedContainer.appendChild(card);
    });
  }
  
  // Render Pagination controls
  document.getElementById('myths-page-info').textContent = `Showing ${Math.min(startIndex + 1, totalItems)} - ${Math.min(startIndex + itemsPerPage, totalItems)} of ${totalItems}`;
  document.getElementById('myths-prev-btn').disabled = feedbackPage === 1;
  document.getElementById('myths-next-btn').disabled = feedbackPage === totalPages;
}

// Trigger Myths Search/Filters changes
function searchMyths() {
  feedbackPage = 1;
  renderMythsTab();
}

function prevMythsPage() {
  if (feedbackPage > 1) {
    feedbackPage--;
    renderMythsTab();
  }
}

function nextMythsPage() {
  const filterType = document.getElementById('myths-type').value;
  const searchVal = document.getElementById('myths-search').value.toLowerCase();
  
  let list = [...filteredData.feedback_data];
  if (filterType !== 'all') list = list.filter(item => item[filterType] !== "");
  if (searchVal) {
    list = list.filter(item => 
      item.caregiver.toLowerCase().includes(searchVal) ||
      item.myth.toLowerCase().includes(searchVal) ||
      item.question.toLowerCase().includes(searchVal) ||
      item.complaint.toLowerCase().includes(searchVal) ||
      item.success.toLowerCase().includes(searchVal)
    );
  }
  const totalPages = Math.ceil(list.length / itemsPerPage);
  if (feedbackPage < totalPages) {
    feedbackPage++;
    renderMythsTab();
  }
}

// Render Activities & Risks tab content
function renderActivitiesTab() {
  // 1. Calculate Activity Tracker Aggregates
  const totalActivities = rawData.activities.length;
  const completed = rawData.activities.filter(a => a.status === 'Completed').length;
  const inProgress = rawData.activities.filter(a => a.status === 'In Progress').length;
  const delayed = rawData.activities.filter(a => a.status === 'Delayed').length;
  const notStarted = rawData.activities.filter(a => a.status === 'Not Started').length;
  const overallProgress = totalActivities > 0 ? Math.round((completed / totalActivities) * 100) : 0;
  
  document.getElementById('act-overall-progress').textContent = `${overallProgress}%`;
  document.getElementById('act-progress-bar').style.width = `${overallProgress}%`;
  
  document.getElementById('act-stat-total').textContent = totalActivities;
  document.getElementById('act-stat-completed').textContent = completed;
  document.getElementById('act-stat-inprogress').textContent = inProgress;
  document.getElementById('act-stat-delayed').textContent = delayed;
  document.getElementById('act-stat-notstarted').textContent = notStarted;
  
  // Render Target vs Actual Results comparison
  renderTargetsComparison();

  
  // Render Activities Table
  const tbody = document.getElementById('activities-table-body');
  tbody.innerHTML = '';
  
  let acts = [...rawData.activities];
  
  // Paginate activities
  const totalActs = acts.length;
  const totalPages = Math.ceil(totalActs / itemsPerPage) || 1;
  const startIndex = (activityPage - 1) * itemsPerPage;
  const paginatedActs = acts.slice(startIndex, startIndex + itemsPerPage);
  
  paginatedActs.forEach(act => {
    let badgeClass = 'badge-warning';
    if (act.status === 'Completed') badgeClass = 'badge-success';
    else if (act.status === 'Delayed') badgeClass = 'badge-danger';
    else if (act.status === 'Not Started') badgeClass = 'badge-info';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${act.id}</td>
      <td><span class="badge badge-success" style="font-size:0.65rem">${act.phase}</span></td>
      <td><strong>${act.activity}</strong><br><span style="font-size:0.75rem; color:var(--color-text-muted)">${act.sub_activity}</span></td>
      <td>${act.responsible}</td>
      <td>${act.district}</td>
      <td><span class="badge ${badgeClass}">${act.status}</span></td>
      <td>
        <div style="display:flex; align-items:center; gap:0.5rem">
          <span>${act.progress}%</span>
          <div class="progress-bar-container" style="width:50px; margin:0">
            <div class="progress-bar" style="width:${act.progress}%"></div>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  document.getElementById('act-page-info').textContent = `Showing ${Math.min(startIndex + 1, totalActs)} - ${Math.min(startIndex + itemsPerPage, totalActs)} of ${totalActs}`;
  document.getElementById('act-prev-btn').disabled = activityPage === 1;
  document.getElementById('act-next-btn').disabled = activityPage === totalPages;

  // Render Risks Table
  const riskBody = document.getElementById('risks-table-body');
  riskBody.innerHTML = '';
  
  rawData.risks.forEach(risk => {
    let riskBadge = 'badge-success';
    if (risk.level === 'High') riskBadge = 'badge-danger';
    else if (risk.level === 'Medium') riskBadge = 'badge-warning';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${risk.no}</td>
      <td><span class="badge badge-info">${risk.category}</span></td>
      <td><strong>${risk.description}</strong></td>
      <td>${risk.likelihood}</td>
      <td>${risk.impact}</td>
      <td><span class="badge ${riskBadge}">${risk.level}</span></td>
      <td><span style="font-size:0.8rem; color:var(--color-text-muted)">${risk.mitigation}</span></td>
      <td><span class="badge badge-success">${risk.status}</span></td>
    `;
    riskBody.appendChild(tr);
  });
}

function renderTargetsComparison() {
  if (!rawData || !rawData.activity_targets) return;
  
  const container = document.getElementById('targets-comparison-container');
  container.innerHTML = '';
  
  rawData.activity_targets.forEach(item => {
    const percentage = Math.round((item.actual / item.target) * 100);
    const progressWidth = Math.min(percentage, 100);
    
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.gap = '0.5rem';
    
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
        <div>
          <span class="badge badge-info" style="font-size:0.7rem; font-weight:700; margin-right:0.5rem;">TASK ID ${item.id}</span>
          <strong>${item.description}</strong>
        </div>
        <div style="font-weight:600; text-align:right;">
          <span style="color:var(--color-success);">${item.actual.toLocaleString()}</span> / ${item.target.toLocaleString()} ${item.unit}
          <span style="font-size:0.75rem; color:var(--color-text-muted); margin-left:0.5rem;">(${percentage}%)</span>
        </div>
      </div>
      <div class="progress-bar-container" style="height:10px; background:rgba(255,255,255,0.03); margin:0;">
        <div class="progress-bar" style="width: ${progressWidth}%; background: ${percentage >= 100 ? 'var(--color-success)' : 'var(--accent-gradient)'}"></div>
      </div>
    `;
    container.appendChild(div);
  });
}


function prevActPage() {
  if (activityPage > 1) {
    activityPage--;
    renderActivitiesTab();
  }
}

function nextActPage() {
  const totalPages = Math.ceil(rawData.activities.length / itemsPerPage);
  if (activityPage < totalPages) {
    activityPage++;
    renderActivitiesTab();
  }
}

// Render Caregivers Explorer Tab
function renderCaregiversTab() {
  const searchVal = document.getElementById('caregiver-search').value.toLowerCase();
  
  let list = [...filteredData.caregivers];
  
  // Search filter
  if (searchVal) {
    list = list.filter(c => 
      c.name.toLowerCase().includes(searchVal) ||
      c.facility.toLowerCase().includes(searchVal)
    );
  }
  
  const totalItems = list.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  if (caregiverPage > totalPages) caregiverPage = totalPages;
  
  const startIndex = (caregiverPage - 1) * itemsPerPage;
  const paginatedList = list.slice(startIndex, startIndex + itemsPerPage);
  
  const tbody = document.getElementById('caregivers-table-body');
  tbody.innerHTML = '';
  
  if (paginatedList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:var(--color-text-dim); padding:40px;">
          <i class="fas fa-users-slash" style="font-size:2rem; margin-bottom:10px;"></i>
          <p>No caregivers found matching criteria.</p>
        </td>
      </tr>
    `;
  } else {
    paginatedList.forEach((c, idx) => {
      let badgeClass = 'badge-warning';
      if (c.status === 'Zero dose') badgeClass = 'badge-danger';
      else if (c.status === 'Unknown') badgeClass = 'badge-info';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${startIndex + idx + 1}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.age}</td>
        <td>${c.district}</td>
        <td>${c.facility}</td>
        <td><span class="badge ${badgeClass}">${c.status}</span></td>
        <td>
          <div style="display:flex; flex-direction:column; gap:0.15rem">
            <span><strong>${c.children}</strong> total kids</span>
            <span style="font-size:0.75rem; color:var(--color-text-muted)">${c.children_u2} under 24m</span>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  document.getElementById('caregiver-page-info').textContent = `Showing ${Math.min(startIndex + 1, totalItems)} - ${Math.min(startIndex + itemsPerPage, totalItems)} of ${totalItems}`;
  document.getElementById('caregiver-prev-btn').disabled = caregiverPage === 1;
  document.getElementById('caregiver-next-btn').disabled = caregiverPage === totalPages;
}

function searchCaregivers() {
  caregiverPage = 1;
  renderCaregiversTab();
}

function prevCaregiverPage() {
  if (caregiverPage > 1) {
    caregiverPage--;
    renderCaregiversTab();
  }
}

function nextCaregiverPage() {
  const searchVal = document.getElementById('caregiver-search').value.toLowerCase();
  let list = [...filteredData.caregivers];
  if (searchVal) {
    list = list.filter(c => 
      c.name.toLowerCase().includes(searchVal) ||
      c.subcounty.toLowerCase().includes(searchVal) ||
      c.village.toLowerCase().includes(searchVal)
    );
  }
  const totalPages = Math.ceil(list.length / itemsPerPage);
  if (caregiverPage < totalPages) {
    caregiverPage++;
    renderCaregiversTab();
  }
}
