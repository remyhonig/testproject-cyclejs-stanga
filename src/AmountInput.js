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


const Amount = (top, left, amount, dirty, focused) => box({
  top, left,
  height: 1,
  width: 12,
  align: 'right',
  fg: dirty ? 'white' : (amount < 0) ? 'red' : 'green',
  bg: focused ? 'lightblue' : 'black',
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

function intent(keys$) {
  return {
    amountChange$: keys$.filter(
      x => R.contains(x, ['-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
    ),
    commit$: keys$.filter(
      x => R.contains(x, ['enter'])
    ),
    clear$: keys$.filter(
      x => R.contains(x, ['delete'])
    ),
    removeLast$: keys$.filter(
      x => R.contains(x, ['backspace'])
    ),
    discard$: keys$.filter(
      x => R.contains(x, ['escape'])
    )
  }
}

function model(Model, intent) {

  return O.merge(
      Model.mod(
        intent
          .amountChange$
          .withLatestFrom(Model)
          .map((key, state) => state => ({...state, pending: parseInt(state.pending + key, 10)}))
      ),
      Model.mod(Model.sample(intent.commit$).map(x => state => ({...state, current: state.pending}))),
      Model.mod(Model.sample(intent.discard$).map(_ => state => ({...state, pending: state.current}))),
      Model.mod(Model.sample(intent.removeLast$).map(_ => state => ({...state, pending: Math.floor(state.pending / 10)}))),
      Model.mod(Model.sample(intent.clear$).map(x => state => ({...state, pending: 0})))
  )
}

function view({Model, props$, repaint$, focus$}) {
  return O.combineLatest(
    Model, props$, repaint$, focus$,
    (state, props, _, focus) => Amount(props.top, props.left, state.pending, state.pending !== state.current, focus)
  );
}

export default function ({Model, props$, keys$, repaint$, focus$}) {
  return {
    Model: model(Model, intent(keys$)),
    Terminal: view({Model, props$, repaint$, focus$})
  };
}