
class CurrencyConverter {
  constructor() {
    this.apiUrl = 'https://api.exchangerate-api.com/v4/latest/';
    this.cryptoApiUrl = 'https://api.coingecko.com/api/v3/simple/price';
    this.exchangeRates = {};
    this.cryptoRates = {};
    this.lastUpdate = null;
    this.cryptoCurrencies = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'TRX', 'LTC'];
    this.chart = null;
    this.chartData = [];
    this.currentPeriod = 7;
    
    this.initializeElements();
    this.bindEvents();
    this.loadInitialData();
    this.initializeChart();
  }

  initializeElements() {
    this.fromCurrency = document.getElementById('fromCurrency');
    this.toCurrency = document.getElementById('toCurrency');
    this.fromAmount = document.getElementById('fromAmount');
    this.toAmount = document.getElementById('toAmount');
    this.swapBtn = document.getElementById('swapBtn');
    this.convertBtn = document.getElementById('convertBtn');
    this.rateValue = document.getElementById('rateValue');
    this.lastUpdated = document.getElementById('lastUpdated');
    this.errorMessage = document.getElementById('errorMessage');
    this.loadingSpinner = document.getElementById('loadingSpinner');
    this.chartCanvas = document.getElementById('rateChart');
    this.periodBtns = document.querySelectorAll('.period-btn');
  }

  bindEvents() {
    this.convertBtn.addEventListener('click', () => this.convertCurrency());
    this.swapBtn.addEventListener('click', () => this.swapCurrencies());
    
    this.fromAmount.addEventListener('input', () => {
      if (this.fromAmount.value && this.exchangeRates[this.toCurrency.value]) {
        this.performConversion();
      }
    });

    this.fromCurrency.addEventListener('change', () => {
      if (this.fromAmount.value) {
        this.convertCurrency();
      }
    });

    this.toCurrency.addEventListener('change', () => {
      if (this.fromAmount.value) {
        this.performConversion();
      } else {
        // Update rate display even without amount
        const fromCur = this.fromCurrency.value;
        const toCur = this.toCurrency.value;
        if (this.exchangeRates[toCur] && fromCur !== toCur) {
          const rate = this.exchangeRates[toCur];
          this.rateValue.textContent = `1 ${fromCur} = ${rate.toFixed(4)} ${toCur}`;
        }
      }
    });

    // Handle Enter key in amount input
    this.fromAmount.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.convertCurrency();
      }
    });

    // Chart period buttons
    this.periodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.periodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPeriod = parseInt(btn.dataset.period);
        this.updateChart();
      });
    });
  }

  async loadInitialData() {
    try {
      await Promise.all([
        this.fetchExchangeRates(this.fromCurrency.value),
        this.fetchCryptoRates()
      ]);
      this.updateLastUpdatedTime();
    } catch (error) {
      console.error('Failed to load initial exchange rates:', error);
    }
  }

  performConversion() {
    const amount = parseFloat(this.fromAmount.value);
    const fromCur = this.fromCurrency.value;
    const toCur = this.toCurrency.value;

    if (fromCur === toCur) {
      this.toAmount.value = amount.toFixed(2);
      this.rateValue.textContent = '1.0000';
      return;
    }

    let rate;
    const fromIsCrypto = this.isCrypto(fromCur);
    const toIsCrypto = this.isCrypto(toCur);

    // Crypto to Crypto
    if (fromIsCrypto && toIsCrypto) {
      if (this.cryptoRates[fromCur] && this.cryptoRates[toCur]) {
        const fromUSD = this.cryptoRates[fromCur].usd;
        const toUSD = this.cryptoRates[toCur].usd;
        rate = fromUSD / toUSD;
      } else {
        this.showError('Crypto rate not available');
        return;
      }
    }
    // Crypto to Fiat
    else if (fromIsCrypto && !toIsCrypto) {
      if (this.cryptoRates[fromCur]) {
        const fiatKey = toCur.toLowerCase();
        rate = this.cryptoRates[fromCur][fiatKey];
        if (!rate) {
          this.showError(`Conversion to ${toCur} not available`);
          return;
        }
      } else {
        this.showError('Crypto rate not available');
        return;
      }
    }
    // Fiat to Crypto
    else if (!fromIsCrypto && toIsCrypto) {
      if (this.cryptoRates[toCur]) {
        const fiatKey = fromCur.toLowerCase();
        const cryptoRate = this.cryptoRates[toCur][fiatKey];
        if (!cryptoRate) {
          this.showError(`Conversion from ${fromCur} not available`);
          return;
        }
        rate = 1 / cryptoRate;
      } else {
        this.showError('Crypto rate not available');
        return;
      }
    }
    // Fiat to Fiat
    else {
      if (this.exchangeRates[toCur]) {
        rate = this.exchangeRates[toCur];
      } else {
        this.showError('Exchange rate not available for selected currency');
        return;
      }
    }

    const convertedAmount = amount * rate;
    
    // Format based on amount size
    if (toIsCrypto) {
      // Show more decimal places for crypto
      this.toAmount.value = convertedAmount.toFixed(8);
    } else if (convertedAmount >= 1000) {
      this.toAmount.value = convertedAmount.toFixed(2);
    } else {
      this.toAmount.value = convertedAmount.toFixed(2);
    }
    
    this.rateValue.textContent = `1 ${fromCur} = ${rate.toFixed(8)} ${toCur}`;
    this.hideError();
  }

  async fetchExchangeRates(baseCurrency) {
    try {
      const response = await fetch(`${this.apiUrl}${baseCurrency}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.exchangeRates = data.rates;
      this.lastUpdate = new Date();
      
      return data;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      throw error;
    }
  }

  async fetchCryptoRates() {
    try {
      const cryptoIds = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'USDT': 'tether',
        'BNB': 'binancecoin',
        'SOL': 'solana',
        'XRP': 'ripple',
        'ADA': 'cardano',
        'DOGE': 'dogecoin',
        'TRX': 'tron',
        'LTC': 'litecoin'
      };

      const ids = Object.values(cryptoIds).join(',');
      const response = await fetch(
        `${this.cryptoApiUrl}?ids=${ids}&vs_currencies=usd,eur,gbp,inr,jpy,cad,aud,chf,cny,krw,aed,sgd,nzd,mxn,brl,zar,hkd,sek,nok,dkk`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch crypto rates');
      }

      const data = await response.json();
      
      // Convert to our format
      this.cryptoRates = {};
      for (let [symbol, id] of Object.entries(cryptoIds)) {
        if (data[id]) {
          this.cryptoRates[symbol] = data[id];
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching crypto rates:', error);
      return null;
    }
  }

  isCrypto(currency) {
    return this.cryptoCurrencies.includes(currency);
  }

  async convertCurrency() {
    const amount = parseFloat(this.fromAmount.value);
    
    if (!amount || amount <= 0) {
      this.showError('Please enter a valid amount');
      return;
    }

    this.showLoading(true);
    this.hideError();

    try {
      const fromIsCrypto = this.isCrypto(this.fromCurrency.value);
      const toIsCrypto = this.isCrypto(this.toCurrency.value);

      // Fetch appropriate rates
      if (fromIsCrypto || toIsCrypto) {
        await this.fetchCryptoRates();
      }
      
      if (!fromIsCrypto) {
        if (!this.exchangeRates[this.toCurrency.value] || 
            !this.lastUpdate || 
            (Date.now() - this.lastUpdate.getTime()) > 300000) {
          await this.fetchExchangeRates(this.fromCurrency.value);
        }
      }

      this.performConversion();
      this.updateLastUpdatedTime();
      
    } catch (error) {
      this.showError('Failed to fetch exchange rates. Please try again.');
      console.error('Conversion error:', error);
    } finally {
      this.showLoading(false);
    }

    // Update chart after conversion
    this.updateChart();
  }

  swapCurrencies() {
    // Swap the select values
    const tempCurrency = this.fromCurrency.value;
    this.fromCurrency.value = this.toCurrency.value;
    this.toCurrency.value = tempCurrency;

    // Swap the amounts
    const tempAmount = this.fromAmount.value;
    this.fromAmount.value = this.toAmount.value;
    this.toAmount.value = tempAmount;

    // If there's an amount, perform conversion with new currencies
    if (this.fromAmount.value) {
      this.convertCurrency();
    }

    // Add visual feedback
    this.swapBtn.style.transform = 'rotate(180deg) scale(1.1)';
    setTimeout(() => {
      this.swapBtn.style.transform = '';
    }, 200);
  }

  showLoading(show) {
    if (show) {
      this.convertBtn.classList.add('loading');
      this.convertBtn.disabled = true;
    } else {
      this.convertBtn.classList.remove('loading');
      this.convertBtn.disabled = false;
    }
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.classList.add('show');
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
      this.hideError();
    }, 5000);
  }

  hideError() {
    this.errorMessage.classList.remove('show');
  }

  updateLastUpdatedTime() {
    if (this.lastUpdate) {
      const timeString = this.lastUpdate.toLocaleTimeString();
      this.lastUpdated.textContent = `Last updated: ${timeString}`;
    }
  }

  // Format number with proper currency formatting
  formatCurrency(amount, currency) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }

  // Initialize Chart.js
  initializeChart() {
    const ctx = this.chartCanvas.getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Exchange Rate',
          data: [],
          borderColor: '#3a7bd5',
          backgroundColor: 'rgba(58, 123, 213, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#3a7bd5',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                return `Rate: ${context.parsed.y.toFixed(4)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 11
              }
            }
          },
          y: {
            beginAtZero: false,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: {
                size: 11
              },
              callback: function(value) {
                return value.toFixed(4);
              }
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  }

  // Generate historical data (simulated for demo)
  async updateChart() {
    const fromCur = this.fromCurrency.value;
    const toCur = this.toCurrency.value;
    
    if (!this.exchangeRates[toCur] && !this.isCrypto(toCur)) {
      return;
    }

    // Get base rate
    let currentRate;
    const fromIsCrypto = this.isCrypto(fromCur);
    const toIsCrypto = this.isCrypto(toCur);

    if (fromIsCrypto && toIsCrypto) {
      if (this.cryptoRates[fromCur] && this.cryptoRates[toCur]) {
        currentRate = this.cryptoRates[fromCur].usd / this.cryptoRates[toCur].usd;
      } else {
        return;
      }
    } else if (fromIsCrypto && !toIsCrypto) {
      const fiatKey = toCur.toLowerCase();
      currentRate = this.cryptoRates[fromCur]?.[fiatKey];
      if (!currentRate) return;
    } else if (!fromIsCrypto && toIsCrypto) {
      const fiatKey = fromCur.toLowerCase();
      currentRate = 1 / (this.cryptoRates[toCur]?.[fiatKey] || 1);
      if (!currentRate) return;
    } else {
      currentRate = this.exchangeRates[toCur] || 1;
    }

    // Generate historical data (simulated with realistic fluctuations)
    const labels = [];
    const data = [];
    const today = new Date();

    for (let i = this.currentPeriod - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Format label based on period
      let label;
      if (this.currentPeriod <= 7) {
        label = date.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (this.currentPeriod <= 30) {
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      
      labels.push(label);
      
      // Simulate realistic rate fluctuation (±3% variation)
      const variation = (Math.random() - 0.5) * 0.06;
      const historicalRate = currentRate * (1 + variation);
      data.push(historicalRate);
    }

    // Update chart
    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = data;
    this.chart.data.datasets[0].label = `${fromCur} to ${toCur}`;
    this.chart.update();
  }
}

// Initialize the converter when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CurrencyConverter();
});

// Handle network status for better UX
window.addEventListener('online', () => {
  console.log('Connection restored');
});

window.addEventListener('offline', () => {
  console.log('Connection lost');
});
