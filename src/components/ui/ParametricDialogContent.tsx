type ParametricDialogActor = {
  color: string
}

type ParametricDialogContentProps = {
  actorCount: number
  actors: ParametricDialogActor[]
  onActorCountChange: (nextCount: number) => void
  onActorColorChange: (actorIndex: number, color: string) => void
}

export function ParametricDialogContent(props: ParametricDialogContentProps) {
  const { actorCount, actors, onActorCountChange, onActorColorChange } = props

  return (
    <>
      <label htmlFor="dialoghiParametricActors">Numero attori</label>
      <input
        id="dialoghiParametricActors"
        type="number"
        min={2}
        max={8}
        value={actorCount}
        onChange={(event) => onActorCountChange(Number(event.target.value) || 2)}
      />

      {actors.map((actor, actorIndex) => (
        <div key={`actor-color-modal-${actorIndex}`} className="actorColorRow">
          <label htmlFor={`actorColorModal${actorIndex}`}>Attore {actorIndex + 1}</label>
          <input
            id={`actorColorModal${actorIndex}`}
            type="color"
            value={actor.color}
            onChange={(event) => onActorColorChange(actorIndex, event.target.value)}
          />
        </div>
      ))}

      <p className="hint">Ordine ciclico automatico: A1, A2, ... fino a riempire la pagina.</p>
    </>
  )
}
