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

  const keys$ = term.on('keypress').pluck(1, 'full').publish();

  const amountInputs$ = M.lens('envelopes').liftListById((id, amountInput$) =>
    AmountInput({Model: amountInput$, props$: O.of({left: 30, top: id}), keys$})
  );

  keys$.connect();

  //flatMerge(amountInputs$, "Events").Events.forEach(console.log);

  return {
    term: flatCombine(amountInputs$, "Terminal").Terminal
      .map(inputs =>
        box(
          {
            top: 1,
            left: 1,
            width: '100%',
            height: '100%',
            bg: 'grey',
            border: true
          },
          inputs
        )
      ),
    exit: term.on('key C-c'),
    M: flatMerge(amountInputs$, "Model").Model
  }
}, {
  term: makeTermDriver(screen),
  exit: exit$ => exit$.forEach(::process.exit),
  M: Model(
    {
      envelopes: [
        {
          'id': 1,
          'current': 123,
          'pending': 123
        },
        {
          'id': 2,
          'current': 456,
          'pending': 456
        }
      ]
    },
    {
      logging: false,
      info: (...args) => console.info(...args)
    }
  )
});
