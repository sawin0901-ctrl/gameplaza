import axios from "axios"

const BASE_URL = "https://api.digiseller.ru/api"
const SELLER_ID = process.env.DIGISELLER_SELLER_ID!
const API_KEY = process.env.DIGISELLER_API_KEY!

export interface DigisellerProduct {
  id_goods: number
  name_goods: string
  info_goods: string
  price_usd: number
  price_rub: number
  currency: string
  image_link?: string
  cnt_goods: number
  status: number
  categories: number[]
}

export interface DigisellerProductList {
  rows: DigisellerProduct[]
  count: number
  pages: number
}

export async function getDigisellerProducts(page = 1, pageSize = 20): Promise<DigisellerProductList> {
  const res = await axios.get(`${BASE_URL}/seller-goods`, {
    params: {
      seller_id: SELLER_ID,
      page,
      rows: pageSize,
      order: "date",
      direction: "desc",
    },
    headers: { Accept: "application/json" },
    timeout: 15000,
  })
  return res.data
}

export async function getDigisellerProduct(productId: number): Promise<DigisellerProduct | null> {
  try {
    const res = await axios.get(`${BASE_URL}/products/info`, {
      params: { product_id: productId, seller_id: SELLER_ID },
      headers: { Accept: "application/json" },
      timeout: 10000,
    })
    return res.data?.product ?? null
  } catch {
    return null
  }
}

export async function checkProductAvailability(productId: number): Promise<boolean> {
  try {
    const product = await getDigisellerProduct(productId)
    return (product?.cnt_goods ?? 0) > 0 && product?.status === 1
  } catch {
    return false
  }
}