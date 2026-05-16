/**
 * SGCM — Módulo de Gráficos (Chart.js)
 * Dependência: Chart.js CDN (adicionar no index.html)
 */

let revenueChart = null;
let servicesChart = null;

function initCharts() {
  // Aguarda o DOM carregar
  if (document.getElementById('revenueChart')) {
    loadRevenueChart();
    loadServicesChart();
  }
}

function loadRevenueChart() {
  const ctx = document.getElementById('revenueChart')?.getContext('2d');
  if (!ctx) return;

  // Coleta dados dos últimos 6 meses
  const historico = DB.getHistorico();
  const meses = [];
  const valores = [];

  for (let i = 5; i >= 0; i--) {
    const data = new Date();
    data.setMonth(data.getMonth() - i);
    const anoMes = data.toISOString().slice(0, 7);
    const nomeMes = data.toLocaleString('pt-BR', { month: 'short' });
    
    const total = historico
      .filter(h => h.registradoEm && h.registradoEm.startsWith(anoMes))
      .reduce((acc, h) => acc + (parseFloat(h.valor) || 0), 0);
    
    meses.push(nomeMes);
    valores.push(total);
  }

  // Destroi gráfico anterior se existir
  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: meses,
      datasets: [{
        label: 'Receita (R$)',
        data: valores,
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (context) => `R$ ${context.raw.toFixed(2)}`
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: (value) => `R$ ${value}`
          }
        }
      }
    }
  });
}

function loadServicesChart() {
  const ctx = document.getElementById('servicesChart')?.getContext('2d');
  if (!ctx) return;

  const stats = DB.getDashboardStats();
  const topServicos = stats.topServicos.slice(0, 5);
  
  const labels = topServicos.map(s => s.servico.nome);
  const data = topServicos.map(s => s.count);

  if (servicesChart) servicesChart.destroy();

  servicesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Quantidade de atendimentos',
        data: data,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
        borderRadius: 8,
        barPercentage: 0.7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}

// Atualizar gráficos quando o dashboard for renderizado
function updateCharts() {
  loadRevenueChart();
  loadServicesChart();
}

// Re-criar gráficos quando o tema mudar (dark mode)
window.addEventListener('darkmodechange', () => {
  setTimeout(() => {
    loadRevenueChart();
    loadServicesChart();
  }, 100);
});
