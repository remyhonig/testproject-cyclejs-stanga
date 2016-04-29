import { run } from '@cycle/core';
import blessed from 'blessed';
import { makeTermDriver , box, textarea, text, button } from 'cycle-blessed';
import { Observable as $ } from 'rx';
import * as R from 'ramda';
import * as L from "partial.lenses";
import curr from 'curr';
import "babel-polyfill";
import {Model, flatCombine, flatMerge} from "stanga"

let screen = blessed.screen({smartCSR: true, useBCE: true, title: 'Budget'});

const EUR = {
    symbol: '€',
    decimalSeparator: ',',
    groupingSeparator: '.',
    decimalPlaces: 2,
    format: '%s %v'
};

let Text = (top, left, content) => text({
    top,
    left,
    height: 1,
    width: 18,
    bg: 'black',
    padding: { left: 1, right: 1 },
    align: 'center', valign: 'middle',
    content
});

let Amount = (top, left, amount) => box({
    top, left,
    height: 1,
    width: 12,
    align: 'right',
    fg: (amount < 0) ? '#FF0000' : 'white',
    tags: true,
    content: '€ ' + curr(
      amount / 100,
      {
        symbol: '€',
        decimalSeparator: ',',
        groupingSeparator: '.',
        decimalPlaces: 2,
        format: '%v'
      }).pval
});

let Header = (top, left) => box(
  {
      top, left,
      width: '100%',
      height: 1,
      bg: 'black',
      border: false
  },
  [
      text({top: 0, left: 1, tags: true, content: '{bold}Categorie{/}'}),
      text({top: 0, left: 22, tags: true, content: '{bold}Bedrag{/}'})
  ]
);

let Envelope = (top, left, title, amount, hasFocus) => box(
  {
      top, left,
      width: '100%',
      height: 1,
      bg: hasFocus ? '#004444' : 'black',
      border: false
  },
  [
      Text(0, 0, title),
      Amount(0, 22, amount)
  ]
);

let Table = (top, left, envelopes) => box(
  {
      top, left,
      width: 60,
      height: 20,
      bg: 'black',
      padding: 0
  },
  [
      Header(0, 0),
      ...envelopes
  ]
);

run(({ term: { on }, M }) => {

    const state$ = M;
    const keys$ = on('keypress').pluck(1, 'full').publish();

    const modDown$ = keys$
        .filter(x => x == "down")
        .map(
            () => ({...state}) => ({
                ...state,
                unenteredAmount: state.envelopes[state.selectedEnvelope + 1].amount,
                selectedEnvelope: state.selectedEnvelope + 1
            })
        );

    const modUp$ = keys$
        .filter(x => x == "up")
        .map(
            () => ({...state}) => ({
                ...state,
                unenteredAmount: state.envelopes[state.selectedEnvelope - 1].amount,
                selectedEnvelope: state.selectedEnvelope - 1
            })
        );

    const cursor$ = $.merge(modDown$, modUp$);

    const amountKeys$ = keys$
      .filter(
          x => R.contains(x, ['backspace','delete','-','0','1','2','3','4','5','6','7','8','9'])
      )
      .scan(
          (a, x) => {
              if (x == '-') {
                return R.concat('-', a);
              }
              if (x == 'backspace') {
                  if (a.length == 1) {
                      return '0';
                  }
                  return a.slice(0, -1);
              }
              if (x == 'delete') {
                  return '0';
              }
              return R.concat(a, x);
          },
          ''
      )
      .map(x => parseInt(x));

    const amountMod$ = amountKeys$.map(x => state => Object.assign({}, state, { unenteredAmount: x}));

    const enteredAmounts$ = $
        .combineLatest(
            keys$.map(x => x == 'enter'),
            amountKeys$,
            (enter, amount) => enter ? amount : false
        )
        .filter(x => x !== false)
        .distinctUntilChanged();


    //const selectedEnvelopeIndexLens = state$.lens("selectedEnvelope");
    //const selectedEnvelope$ = selectedEnvelopeIndexLens.map(
    //    index => state$.lens(L.compose(L.prop('envelopes'), L.index(index), L.prop('amount')))
    //);

    //selectedEnvelopeIndexLens.forEach(console.log);
    //selectedEnvelope$.forEach(lens => lens.forEach(console.log));

    /**
     * An observable of amounts
     * @type {number|*}
     */
    //const x = flatMerge(selectedEnvelope$, "amount").amount;
    //console.log(x);
    //x.forEach(console.log);

    const amountUpdateMod$ = enteredAmounts$.map(
        amount => {
            return state => {
                let copy = Object.assign({}, state, {});
                copy.envelopes[state.selectedEnvelope].amount = amount;
                //console.log(copy);
                return copy;
            }
        });
    //let text$ = on('keypress').pluck(0).scan((a, x) => a + x, '').startWith('');

    const viewEnvelopes$ = state$.map(state => state.envelopes.map(
        (envelope, index) => Envelope(
            index + 1, 0,
            envelope.category,
            state.selectedEnvelope == index ? state.unenteredAmount : envelope.amount,
            state.selectedEnvelope == index
        )
    ));

    keys$.connect();

    return {
        term: $.combineLatest(viewEnvelopes$, envelopes => Table(0, 0, envelopes)),
        exit: on('key C-c'),
        M: $.merge(M.mod(amountMod$), M.mod(cursor$), M.mod(amountUpdateMod$))
    }
}, {
    term: makeTermDriver(screen),
    exit: exit$ => exit$.forEach(::process.exit),
    M: Model({
        'selectedEnvelope': 0,
        'unenteredAmount': 120,
        'envelopes': [
            {category: 'boodschappen', amount: 120},
            {category: 'hypotheek', amount: 8000},
            {category: 'leuke dingen', amount: 1500},
            {category: 'huur', amount: -750}
        ]
    })
});
