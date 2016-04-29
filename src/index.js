import { run } from '@cycle/core';
import blessed from 'blessed';
import { makeTermDriver , box, textarea, text, button } from 'cycle-blessed';
import { Observable as O } from 'rx';
import * as R from 'ramda';
import * as L from "partial.lenses";
import curr from 'curr';
import "babel-polyfill";
import {Model, flatCombine, flatMerge} from "stanga";
import AmountInput from './AmountInput';

let screen = blessed.screen({smartCSR: true, useBCE: true, title: 'Budget'});

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

run(({ term, M }) => {

    const state$ = M;
    state$.forEach(console.log);

    const keys$ = term.on('keypress').pluck(1, 'full').publish();

    const amountInput = AmountInput({
        Model: M,
        Terminal: term,
        props$: O.of({left: 1, top: 1})
    });

    keys$.connect();

    return {
        term: amountInput.Terminal,
        exit: term.on('key C-c'),
        M: amountInput.Model
    }
}, {
    term: makeTermDriver(screen),
    exit: exit$ => exit$.forEach(::process.exit),
    M: Model({
        'current': null,
        'pending': null
    })
});
