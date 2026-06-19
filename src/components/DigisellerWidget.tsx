const SELLER_ID = "1459731"

interface Props {
  productId: number
  mode?: "card" | "full"
}

export default function DigisellerWidget({ productId, mode = "full" }: Props) {
  const isCard = mode === "card"
  return (
    <div
      className="digiseller-buy-standalone"
      data-id={String(productId)}
      data-ai={SELLER_ID}
      data-img={isCard ? "0" : "1"}
      data-img-size="180"
      data-name={isCard ? "0" : "1"}
      data-price="1"
      data-owner={isCard ? "0" : "1"}
      data-no-price="0"
    />
  )
}
