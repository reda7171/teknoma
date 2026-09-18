import 'recharts';

declare module 'recharts' {
    export interface TooltipProps<ValueType extends import('recharts/types/component/DefaultTooltipContent').ValueType, NameType extends import('recharts/types/component/DefaultTooltipContent').NameType> {
        wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
    }
}
