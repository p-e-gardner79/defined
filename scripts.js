
        // DOM Elements
        const inputs = document.querySelectorAll('input, select');
        const dcTab = document.getElementById('dcTab');
        const dbTab = document.getElementById('dbTab');
        const dcInputs = document.getElementById('dcInputs');
        const dbInputs = document.getElementById('dbInputs');
        const dcChartWrapper = document.getElementById('dcChartWrapper');
        const dbChartWrapper = document.getElementById('dbChartWrapper');
        const incomeChartWrapper = document.getElementById('incomeChartWrapper');

        // Chart instances
        let dcGrowthChart, dbGrowthChart, incomeComparisonChart;

        // Brand Colors
        const brandColors = {
            blue: '#82cff4',
            teal: '#54bbab',
            darkBlue: '#183850'
        };

        // --- UTILITY FUNCTIONS ---
        const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;
        const formatCurrency = (value) => `£${Math.round(value).toLocaleString('en-GB')}`;

        // --- TAB HANDLING ---
        dcTab.addEventListener('click', () => {
            dcTab.classList.add('active');
            dbTab.classList.remove('active');
            dcInputs.classList.remove('hidden');
            dbInputs.classList.add('hidden');
            
            dcChartWrapper.classList.remove('hidden');
            dbChartWrapper.classList.add('hidden');
        });

        dbTab.addEventListener('click', () => {
            dbTab.classList.add('active');
            dcTab.classList.remove('active');
            dbInputs.classList.remove('hidden');
            dcInputs.classList.add('hidden');

            dbChartWrapper.classList.remove('hidden');
            dcChartWrapper.classList.add('hidden');
        });

        // --- CALCULATION LOGIC ---
        function calculateProjections() {
            const currentAge = getVal('currentAge');
            const retirementAge = getVal('retirementAge');
            const salary = getVal('salary');
            const salaryGrowth = getVal('salaryGrowth') / 100;
            const yearsToRetirement = Math.max(0, retirementAge - currentAge);

            // --- DC Calculation ---
            const dcPot = getVal('dcPot');
            const dcContribution = getVal('dcContribution') / 100;
            const dcEmployerContribution = getVal('dcEmployerContribution') / 100;
            const totalContributionRate = dcContribution + dcEmployerContribution;
            const investmentGrowth = getVal('investmentGrowth') / 100;

            let futureDCPot = dcPot;
            let currentSalaryForDC = salary;
            const dcGrowthData = [];
            const dcLabels = [];

            for (let i = 0; i < yearsToRetirement; i++) {
                const annualContribution = currentSalaryForDC * totalContributionRate;
                futureDCPot = (futureDCPot + annualContribution) * (1 + investmentGrowth);
                currentSalaryForDC *= (1 + salaryGrowth);
                dcGrowthData.push(futureDCPot);
                dcLabels.push(`Age ${currentAge + i + 1}`);
            }

            // --- DB Calculation ---
            const dbServiceYears = getVal('dbServiceYears');
            const dbAccrualRate = getVal('dbAccrualRate');
            const dbSchemeType = document.getElementById('dbSchemeType').value;
            
            const dbGrowthData = [];
            const dbLabels = [];
            let currentSalaryForDB = salary;
            let totalRevaluedEarnings = 0;

            for (let i = 0; i < dbServiceYears; i++) {
                let pensionableSalary;
                if (dbSchemeType === 'final') {
                    pensionableSalary = currentSalaryForDB;
                } else { // CARE
                    totalRevaluedEarnings += currentSalaryForDB;
                    pensionableSalary = totalRevaluedEarnings / (i + 1);
                }
                
                const accruedIncome = (dbAccrualRate > 0) ? ((i + 1) / dbAccrualRate) * pensionableSalary : 0;
                dbGrowthData.push(accruedIncome);
                dbLabels.push(`Year ${i + 1}`);
                currentSalaryForDB *= (1 + salaryGrowth);
            }
            
            const finalAnnualDBIncome = dbGrowthData.length > 0 ? dbGrowthData[dbGrowthData.length - 1] : 0;

            // --- Annuity Calculation (for DC comparison) ---
            const annuityRate = 0.04; 
            const annualDCIncome = futureDCPot * annuityRate;

            return {
                dc: {
                    finalPot: futureDCPot,
                    annualIncome: annualDCIncome,
                    growthData: dcGrowthData,
                    labels: dcLabels
                },
                db: {
                    annualIncome: finalAnnualDBIncome,
                    growthData: dbGrowthData,
                    labels: dbLabels
                }
            };
        }

        // --- UI & CHART UPDATE ---
        function updateUI() {
            const projections = calculateProjections();
            document.getElementById('dcResult').textContent = formatCurrency(projections.dc.finalPot);
            document.getElementById('dbResult').textContent = `${formatCurrency(projections.db.annualIncome)} / year`;
            updateDcGrowthChart(projections.dc.labels, projections.dc.growthData);
            updateDbGrowthChart(projections.db.labels, projections.db.growthData);
            updateIncomeComparisonChart(projections.dc.annualIncome, projections.db.annualIncome);
        }

        function createCharts() {
            // Set default font for all charts
            Chart.defaults.font.family = 'Arial, sans-serif';

            // DC Growth Chart
            const dcCtx = document.getElementById('dcGrowthChart').getContext('2d');
            dcGrowthChart = new Chart(dcCtx, {
                type: 'line', data: { labels: [], datasets: [{ label: 'Projected DC Pot Value', data: [], borderColor: brandColors.blue, backgroundColor: 'rgba(130, 207, 244, 0.2)', fill: true, tension: 0.4 }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: (value) => formatCurrency(value) } }, x: { grid: { display: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `Pot Value: ${formatCurrency(context.parsed.y)}` } } } }
            });

            // DB Growth Chart
            const dbCtx = document.getElementById('dbGrowthChart').getContext('2d');
            dbGrowthChart = new Chart(dbCtx, {
                type: 'line', data: { labels: [], datasets: [{ label: 'Accrued Annual Income', data: [], borderColor: brandColors.teal, backgroundColor: 'rgba(84, 187, 171, 0.2)', fill: true, tension: 0.4 }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: (value) => formatCurrency(value) } }, x: { title: { display: true, text: 'Years of Service' }, grid: { display: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `Annual Income: ${formatCurrency(context.parsed.y)}` } } } }
            });

            // Income Comparison Chart
            const incomeCtx = document.getElementById('incomeComparisonChart').getContext('2d');
            incomeComparisonChart = new Chart(incomeCtx, {
                type: 'bar', data: { labels: ['DC (Annuity Estimate)', 'DB (Guaranteed)'], datasets: [{ label: 'Annual Income', data: [], backgroundColor: [brandColors.blue, brandColors.teal], borderRadius: 6 }] },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { ticks: { callback: (value) => formatCurrency(value) } }, y: { grid: { display: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `Annual Income: ${formatCurrency(context.parsed.x)}` } } } }
            });
        }

        function updateDcGrowthChart(labels, data) {
            dcGrowthChart.data.labels = labels;
            dcGrowthChart.data.datasets[0].data = data;
            dcGrowthChart.update();
        }
        
        function updateDbGrowthChart(labels, data) {
            dbGrowthChart.data.labels = labels;
            dbGrowthChart.data.datasets[0].data = data;
            dbGrowthChart.update();
        }

        function updateIncomeComparisonChart(dcIncome, dbIncome) {
            incomeComparisonChart.data.datasets[0].data = [dcIncome, dbIncome];
            incomeComparisonChart.update();
        }

        // --- INITIALIZATION ---
        document.addEventListener('DOMContentLoaded', () => {
            createCharts();
            updateUI();
            inputs.forEach(input => input.addEventListener('input', updateUI));
        });