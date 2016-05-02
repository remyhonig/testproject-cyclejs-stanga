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
    const keys$ = term.on('keypress').pluck(1, 'full').publish();

    const amountInputs = [
      AmountInput({
        keys$,
        Model: M.lens(0),
        Terminal: term,
        props$: O.of({left: 30, top: 2})
      }),
      AmountInput({
        keys$,
        Model: M.lens(1),
        Terminal: term,
        props$: O.of({left: 30, top: 1})
      })
    ];

    const amountInputs$ = O
      .combineLatest(amountInputs.map(x => x.Terminal))
      .map(inputs =>
        box(
          {
            top: 1,
            left: 1,
            width: '100%',
            height: '100%',
            bg: 'cyan',
            border: true
          },
          inputs
        )
      );

    keys$.connect();

    return {
        term: amountInputs$,
        exit: term.on('key C-c'),
        M: O.merge(amountInputs.map(x => x.Model))
    }
}, {
    term: makeTermDriver(screen),
    exit: exit$ => exit$.forEach(::process.exit),
    M: Model(
      [
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
      ],
      {
        logging: true,
        info: (...args) => console.info(...args)
      }
    )
});
