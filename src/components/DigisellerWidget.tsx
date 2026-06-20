const AFFILIATE_ID = "1459731"

interface Props {
  productId: number
}

export default function DigisellerWidget({ productId }: Props) {
  return (
    <div
      style={{ display: "inline-block" }}
      className="digiseller-buy-standalone"
      data-id={String(productId)}
      data-ai={AFFILIATE_ID}
      data-img="0"
      data-img-size=""
      data-name="1"
      data-price="1"
      data-no-price="0"
    />
  )
}
