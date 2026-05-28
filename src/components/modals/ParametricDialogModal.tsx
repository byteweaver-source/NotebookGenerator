import { ModalShell } from '../ui/ModalShell'
import { ParametricDialogContent } from '../ui/ParametricDialogContent'

type ParametricDialogActor = {
  color: string
}

type ParametricDialogModalProps = {
  open: boolean
  actorCount: number
  actors: ParametricDialogActor[]
  onClose: () => void
  onActorCountChange: (nextCount: number) => void
  onActorColorChange: (actorIndex: number, color: string) => void
}

export function ParametricDialogModal(props: ParametricDialogModalProps) {
  const {
    open,
    actorCount,
    actors,
    onClose,
    onActorCountChange,
    onActorColorChange,
  } = props

  if (!open) {
    return null
  }

  return (
    <ModalShell
      title="Dialoghi Parametrico"
      ariaLabel="Impostazioni dialoghi parametrici"
      onClose={onClose}
    >
      <ParametricDialogContent
        actorCount={actorCount}
        actors={actors}
        onActorCountChange={onActorCountChange}
        onActorColorChange={onActorColorChange}
      />
    </ModalShell>
  )
}
