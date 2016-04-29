import {Observable as O} from "rx";
import { box, textarea, text, button } from 'cycle-blessed';
import curr from 'curr';
import * as R from 'ramda';

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

export default function({Terminal, Model, props$}) {

    const keys$ = Terminal.on('keypress').pluck(1, 'full').publish();

    const amount$ = keys$
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

    const pendingMod$ = amount$
        .map(x => state => ({...state}) => ({...state, pending: x}));

    const currentMod$ = O
        .combineLatest(
            keys$.map(x => x == 'enter'),
            amount$,
            (enter, amount) => enter ? amount : false
        )
        .filter(x => x !== false)
        .distinctUntilChanged()
        .map(x => state => ({...state}) => ({...state, current: x}));

    const gui$ = O.combineLatest(
        amount$, props$,
        (amount, props) => Amount(props.top, props.left, amount));

    keys$.connect();

    return {
        Terminal: gui$,
        Model: O.merge(Model.mod(pendingMod$), Model.mod(currentMod$))
    }
}
