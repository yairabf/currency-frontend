import React from 'react'
import AddCurrencyComponent from './AddCurrencyComponent'
import CurrencyList from './CurrencyList'
import fetchRates from './currencyRateFetcher'
import fetchNextCalculatorState from './calculatorService'
import CalculatorDisplay from './CalculatorDisplay'
import CalculatorKeypad from './CalculatorKeypad'

import './CurrencyContainerComponent.css'

export default class CurrencyContainerComponent extends React.Component {
  constructor(props) {
    super(props)

    this.state = {rates: [], calculatorState: undefined}
  }

  componentDidMount() {
    this.fetchUserCurrencies()
  }

  async fetchUserCurrencies() {
    const passCookies = {credentials: 'same-origin'}
    const {id} = await (await fetch('/user-info', passCookies)).json()
    const {currencies = []} = await (await fetch(`/user/data/${id}`, passCookies)).json()
    console.log('currencies read:', currencies)
    this.setState(
      state => ({rates: [...state.rates, ...mergeCurrencies(state.rates, currencies)]}),
      () => {
        this.fetchRatesForSymbols()
      },
    )
  }

  async currenciesUpdate() {
    const passCookies = {credentials: 'same-origin'}
    const {id} = await (await fetch('/user-info', passCookies)).json()
    const currencies = this.state.rates.map(({symbol}) => symbol)
    console.log('currencies to write', currencies)

    await fetch(`/user/data/${id}`, {
      method: 'PUT',
      body: JSON.stringify({currencies}),
      headers: {
        'content-type': 'application/json',
      },
      credentials: 'same-origin',
    })
  }

  async fetchRatesForSymbols() {
    const newRates = await fetchRates({
      symbols: this.state.rates.map(({symbol}) => symbol),
      baseCurrencySymbol: 'USD',
    })

    console.log('newRates:', newRates)

    await this.setState(
      rates => ({rates: newRates}),
      () => {
        console.log('after fetched rates:', this.state.rates)
      },
    )
  }

  async nextCalculatorState(input) {
    const nextCalculatorState = await fetchNextCalculatorState(
      this.state.calculatorState,
      input,
      this.state.rates,
    ).catch(err => (err.message.includes('status: 404') ? {display: input} : Promise.reject(err)))

    this.setState(state => ({calculatorState: nextCalculatorState}))
  }

  addCurrencySymbol(symbolToAdd) {
    this.setState(
      state => ({
        rates: state.rates.find(({symbol}) => symbol === symbolToAdd)
          ? state.rates
          : [...state.rates, {symbol: symbolToAdd}],
      }),
      () => {
        this.fetchRatesForSymbols()
        this.currenciesUpdate()
      },
    )
  }

  deleteCurrencySymbol(symbolToDelete) {
    this.setState(state => ({
      rates: state.rates.filter(({symbol}) => symbol !== symbolToDelete),
    }))
  }

  render() {
    return (
      <div className="app-wrapper">
        <div className="currency-wrapper">
          <AddCurrencyComponent addCurrency={symbol => this.addCurrencySymbol(symbol)} key="1" />
          <CurrencyList
            key="2"
            rates={this.state.rates}
            deleteCurrency={symbol => this.deleteCurrencySymbol(symbol)}
          />
        </div>
        <div className="calculator-wrapper">
          <div className="display-wrapper">
            <CalculatorDisplay display={(this.state.calculatorState || {}).display} />
          </div>
          <div className="calculator-keys">
            <CalculatorKeypad
              currencies={this.state.rates.map(({symbol}) => symbol)}
              onKeypad={input => this.nextCalculatorState(input)}
            />
          </div>
        </div>
      </div>
    )
  }
}
// function mergeCurrencies(newCurrencies) {
//   console.log('new currencies from mergCurrencies:', newCurrencies)
//   return {symbol: 'ILS', rate: 3.4325}
// }

function mergeCurrencies(rates, newCurrencies) {
  return newCurrencies.map(currency => ({symbol: currency}))
}
