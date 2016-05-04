import {Observable as O} from "rx";
import { box, textarea, text, button } from 'cycle-blessed';
import curr from 'curr';
import * as R from 'ramda';
import util from 'util';

const SetCurrentAmount = ({id, amount}) => ({
  EVENT: 'SET_CURRENT_AMOUNT', id, amount
});

const SetPendingAmount = ({id, amount}) => ({
  EVENT: 'SET_PENDING_AMOUNT', id, amount
});


const Amount = (top, left, amount, dirty) => box({
    top, left,
    height: 1,
    width: 12,
    align: 'right',
    fg: dirty ? 'white' : (amount < 0) ? 'red' : 'green',
    bg: dirty ? 'blue' : 'black',
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
      .filter(x => R.contains(x, ['escape', 'backspace','delete','-','0','1','2','3','4','5','6','7','8','9']))
      .withLatestFrom(Model, (key, state) => [key, state.pending.toString(), state.current.toString()])
      .map(([key, pending, current]) => {
        if (key == 'escape') {
          return current;
        }
        if (key == '-') {
          return R.concat('-', pending);
        }
        if (key == 'backspace') {
          if (pending.length == 1) {
            return '0';
          }
          return pending.slice(0, -1);
        }
        if (key == 'delete') {
          return '0';
        }
        return R.concat(pending, key);
      })
      // http://stackoverflow.com/questions/16880327/why-am-i-getting-weird-result-using-parseint-in-node-js-different-result-from
      .map(x => parseInt(x, 10))
      .distinctUntilChanged()
      .publish();

    const enteredAmount$ = amount$.sample(keys$.filter(x => x == 'enter')).distinctUntilChanged();

    const currentMod$ = enteredAmount$.map(x => state => ({...state, current: x}));
    const pendingMod$ = amount$.map(x => state => ({...state, pending: x}));

    const currentEvent$ = enteredAmount$.withLatestFrom(Model, (amount, model) => SetCurrentAmount({id: model.id, amount}));
    const pendingEvent$ = amount$.withLatestFrom(Model, (amount, model) => SetPendingAmount({id: model.id, amount}));

    amount$.connect();

    const gui$ = O.combineLatest(
        Model, props$,
        (state, props) => Amount(props.top, props.left, state.pending, state.pending !== state.current)
    );

    return {
        Terminal: gui$,
        Model: O.merge(Model.mod(pendingMod$), Model.mod(currentMod$)),
        Events: O.merge(currentEvent$, pendingEvent$)
    }
}
