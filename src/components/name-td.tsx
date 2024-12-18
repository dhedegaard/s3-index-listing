import { memo, type HTMLProps } from 'react'

export const NameTd = memo(function NameTd(props: HTMLProps<HTMLTableCellElement>) {
  return <td {...props} className="w-auto overflow-hidden text-ellipsis text-left" />
})
