document.addEventListener('DOMContentLoaded', () => {
    // --- State & Config ---
    const config = {
        pdfPath: '/syllabus/',
        currentSem: 5
    };
    
    // --- Navigation & Routing ---
    const navItems = document.querySelectorAll('.nav-links li');
    const views = document.querySelectorAll('.view');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Switch view
            const targetView = item.getAttribute('data-view');
            views.forEach(view => {
                view.classList.remove('active');
                if (view.id === `view-${targetView}`) {
                    view.classList.add('active');
                    loadViewData(targetView); // Lazy load data
                }
            });

            // Close mobile menu if open
            if(window.innerWidth <= 768) sidebar.classList.remove('open');
        });
    });

    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

    // --- Dark Mode Toggle ---
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        const root = document.documentElement;
        const newTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', newTheme);
        updateChartTheme(newTheme);
    });

    // --- Date & Time ---
    const updateDateTime = () => {
        const now = new Date();
        document.getElementById('datetime').innerText = now.toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
        });
    };
    setInterval(updateDateTime, 1000);
    updateDateTime();

    // --- Data Fetching & Rendering ---
    async function loadJSON(filename) {
        try {
            const response = await fetch(`json/${filename}.json`);
            return await response.json();
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            return null;
        }
    }

    async function loadViewData(view) {
        if (view === 'subjects' && !document.getElementById('subjectsGrid').innerHTML.trim()) {
            const data = await loadJSON('subjects');
            renderSubjects(data);
            renderCGPAForm(data); // Pre-fill CGPA form based on subjects
        }
        if (view === 'timetable' && !document.getElementById('timetableGrid').innerHTML.trim()) {
            const data = await loadJSON('timetable');
            renderTimetable(data);
        }
        if (view === 'faculty' && !document.getElementById('facultyGrid').innerHTML.trim()) {
            const data = await loadJSON('faculty');
            renderFaculty(data);
        }
        if (view === 'attendance' && !window.attendanceLoaded) {
            const data = await loadJSON('attendance');
            renderAttendanceChart(data);
            window.attendanceLoaded = true;
        }
    }

    // --- Render Functions ---
    function renderSubjects(subjects) {
        const grid = document.getElementById('subjectsGrid');
        grid.innerHTML = subjects.map(sub => `
            <div class="card glass">
                <h3>${sub.name}</h3>
                <p class="text-secondary">${sub.code} • ${sub.credits} Credits</p>
                <p>Prof. ${sub.faculty}</p>
                <button class="btn btn-primary" style="margin-top:16px;" 
                    onclick="window.open('${config.pdfPath}${sub.code}.pdf', '_blank')">
                    View Syllabus
                </button>
            </div>
        `).join('');
    }

    function renderTimetable(schedule) {
        const grid = document.getElementById('timetableGrid');
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const times = ['10:30 - 11:30', '11:30 - 12:30', '13:00 - 14:00', '14:00 - 15:00'];
        
        let html = `<tr><th>Day / Time</th>${times.map(t => `<th>${t}</th>`).join('')}</tr>`;
        
        days.forEach(day => {
            html += `<tr><td><strong>${day}</strong></td>`;
            if (schedule[day]) {
                schedule[day].forEach(slot => {
                    html += `<td class="clickable" onclick="openModal('${slot.subject}', '${slot.code}', '${slot.room}')">
                        ${slot.subject}<br><small>${slot.room}</small>
                    </td>`;
                });
            } else {
                html += `<td colspan="4" style="text-align:center;">Off Day</td>`;
            }
            html += `</tr>`;
        });
        grid.innerHTML = html;
    }

    function renderFaculty(faculty) {
        const grid = document.getElementById('facultyGrid');
        grid.innerHTML = faculty.map(fac => `
            <div class="card glass" style="display:flex; align-items:center; gap:16px;">
                <div style="width:60px; height:60px; border-radius:50%; background:var(--primary-color); display:flex; justify-content:center; align-items:center; color:white; font-size:24px;">
                    ${fac.name.charAt(0)}
                </div>
                <div>
                    <h3>${fac.name}</h3>
                    <p class="text-secondary">${fac.designation}</p>
                    <small>${fac.email}</small>
                </div>
            </div>
        `).join('');
    }

    // --- CGPA Calculator Logic ---
    function renderCGPAForm(subjects) {
        const form = document.getElementById('cgpaForm');
        form.innerHTML = subjects.map((sub, i) => `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; align-items:center;">
                <span>${sub.name} (${sub.credits} Cr)</span>
                <select class="grade-select" data-credits="${sub.credits}" style="padding:8px; border-radius:8px; background:var(--bg-color); color:var(--text-primary); border:1px solid var(--glass-border);">
                    <option value="10">AA (10)</option>
                    <option value="9">AB (9)</option>
                    <option value="8">BB (8)</option>
                    <option value="7">BC (7)</option>
                    <option value="6">CC (6)</option>
                    <option value="5">CD (5)</option>
                    <option value="4">DD (4)</option>
                    <option value="0">FF (0)</option>
                </select>
            </div>
        `).join('');

        document.querySelectorAll('.grade-select').forEach(select => {
            select.addEventListener('change', calculateSGPA);
        });
        calculateSGPA();
    }

    function calculateSGPA() {
        const selects = document.querySelectorAll('.grade-select');
        let totalCredits = 0;
        let totalPoints = 0;
        selects.forEach(sel => {
            const credits = parseFloat(sel.getAttribute('data-credits'));
            const grade = parseFloat(sel.value);
            totalCredits += credits;
            totalPoints += (credits * grade);
        });
        const sgpa = (totalPoints / totalCredits).toFixed(2);
        document.getElementById('sgpaResult').innerText = sgpa;
    }

    // --- Chart.js for Attendance ---
    let attChart;
    function renderAttendanceChart(data) {
        const ctx = document.getElementById('attendanceChart').getContext('2d');
        const labels = data.map(d => d.subject);
        const percentages = data.map(d => d.percentage);
        
        attChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Attendance %',
                    data: percentages,
                    backgroundColor: 'rgba(0, 82, 204, 0.6)',
                    borderColor: '#0052CC',
                    borderWidth: 1,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true, max: 100 } },
                plugins: { legend: { display: false } }
            }
        });
    }

    function updateChartTheme(theme) {
        if(attChart) {
            const color = theme === 'dark' ? '#f8fafc' : '#1e293b';
            attChart.options.scales.x.ticks.color = color;
            attChart.options.scales.y.ticks.color = color;
            attChart.update();
        }
    }

    // --- Modal Logic ---
    window.openModal = function(subject, code, room) {
        document.getElementById('modalTitle').innerText = subject;
        document.getElementById('modalBody').innerHTML = `
            <p><strong>Code:</strong> ${code}</p>
            <p><strong>Location:</strong> Room ${room}</p>
            <p>Use the buttons below to access course materials.</p>
        `;
        document.getElementById('subjectModal').classList.add('active');
    };

    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('subjectModal').classList.remove('active');
    });

    // Initialize Home Data on load
    loadViewData('home');
});
          
