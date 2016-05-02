import {Observable as O} from "rx";
import { box, textarea, text, button } from 'cycle-blessed';
import curr from 'curr';
import * as R from 'ramda';
import util from 'util';

const Amount = (top, left, amount) => box({
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

export default function({Terminal, Model, props$, keys$}) {

    const amount$ = keys$
      .filter(
          x => R.contains(x, ['backspace','delete','-','0','1','2','3','4','5','6','7','8','9'])
        )
      .withLatestFrom(
        Model,
        (key, state) => {
          return [key, state.pending.toString()]
        })
      .map(([key, chars]) => {
        if (key == '-') {
          return R.concat('-', chars);
        }
        if (key == 'backspace') {
          if (chars.length == 1) {
            return '0';
          }
          return chars.slice(0, -1);
        }
        if (key == 'delete') {
          return '0';
        }
        return R.concat(chars, key);
      })
      .map(x => parseInt(x, 10))
      .publish();

    const pendingMod$ = amount$
        .map(x => state => ({...state, pending: x}));

    const currentMod$ = O
        .combineLatest(
            keys$.map(x => x == 'enter'),
            amount$,
            (enter, amount) => enter ? amount : false
        )
        .filter(x => x !== false)
        .distinctUntilChanged()
        .map(x => state => ({...state, current: x}));

    amount$.connect();

    const gui$ = O.combineLatest(
        Model, props$,
        (state, props) => Amount(props.top, props.left, state.pending));

    return {
        Terminal: gui$,
        Model: O.merge(Model.mod(pendingMod$), Model.mod(currentMod$))
    }
}
