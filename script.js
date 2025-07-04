
class CurrencyConverter {
  constructor() {
    this.apiUrl = 'https://api.exchangerate-api.com/v4/latest/';
    this.fallbackApiUrl = 'https://api.exchangerate.host/latest';
    this.exchangeRates = {};
    this.lastUpdate = null;
    
    this.initializeElements();
    this.bindEvents();
    this.loadInitialData();
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
  }

  bindEvents() {
    this.convertBtn.addEventListener('click', () => this.convertCurrency());
    this.swapBtn.addEventListener('click', () => this.swapCurrencies());
    
    this.fromAmount.addEventListener('input', () => {
      if (this.fromAmount.value && this.exchangeRates[this.fromCurrency.value]) {
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
        this.convertCurrency();
      }
    });

    // Handle Enter key in amount input
    this.fromAmount.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.convertCurrency();
      }
    });
  }

  async loadInitialData() {
    try {
      await this.fetchExchangeRates(this.fromCurrency.value);
      this.updateLastUpdatedTime();
    } catch (error) {
      console.error('Failed to load initial exchange rates:', error);
    }
  }

  async fetchExchangeRates(baseCurrency) {
    try {
      // Try primary API first
      let response = await fetch(`${this.apiUrl}${baseCurrency}`);
      
      if (!response.ok) {
        // Fallback to alternative API
        response = await fetch(`${this.fallbackApiUrl}?base=${baseCurrency}`);
      }

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

  async convertCurrency() {
    const amount = parseFloat(this.fromAmount.value);
    
    if (!amount || amount <= 0) {
      this.showError('Please enter a valid amount');
      return;
    }

    this.showLoading(true);
    this.hideError();

    try {
      // Fetch fresh rates if we don't have them or they're for a different base currency
      if (!this.exchangeRates[this.toCurrency.value] || 
          !this.lastUpdate || 
          (Date.now() - this.lastUpdate.getTime()) > 300000) { // 5 minutes
        await this.fetchExchangeRates(this.fromCurrency.value);
      }

      this.performConversion();
      this.updateLastUpdatedTime();
      
    } catch (error) {
      this.showError('Failed to fetch exchange rates. Please try again.');
      console.error('Conversion error:', error);
    } finally {
      this.showLoading(false);
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
    if (this.exchangeRates[toCur]) {
      rate = this.exchangeRates[toCur];
    } else {
      this.showError('Exchange rate not available for selected currency');
      return;
    }

    const convertedAmount = amount * rate;
    this.toAmount.value = convertedAmount.toFixed(2);
    this.rateValue.textContent = `1 ${fromCur} = ${rate.toFixed(4)} ${toCur}`;
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
}

// Initialize the converter when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CurrencyConverter();
});

// Add some utility functions for enhanced user experience
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Handle network status for better UX
window.addEventListener('online', () => {
  console.log('Connection restored');
});

window.addEventListener('offline', () => {
  console.log('Connection lost');
});
