"use client"
import { useState } from "react"
import Link from "next/link"

const FAQS = [
  {
    category: "Покупка и оплата",
    items: [
      {
        q: "Как сделать заказ?",
        a: "Выберите товар в каталоге, нажмите «Купить», выберите способ оплаты и завершите оплату. После успешной транзакции ключ активации будет отправлен на ваш email автоматически.",
      },
      {
        q: "Какие способы оплаты принимаются?",
        a: "Visa, Mastercard, МИР, СБП (Система быстрых платежей), ЮMoney, QIWI и другие. Все платежи проходят через Digiseller — безопасный платёжный агрегатор.",
      },
      {
        q: "Безопасно ли вводить данные карты?",
        a: "Да. Мы не храним данные карт — все платежи обрабатывает Digiseller (PCI DSS совместимый сервис). Ваши платёжные данные защищены по стандартам банковской безопасности.",
      },
      {
        q: "Можно ли оплатить криптовалютой?",
        a: "Да, через Digiseller доступна оплата криптовалютой. Выберите соответствующий способ оплаты при оформлении заказа.",
      },
    ],
  },
  {
    category: "Доставка и получение ключа",
    items: [
      {
        q: "Как быстро придёт ключ?",
        a: "Мгновенно. Ключ активации приходит на email сразу после успешной оплаты — без ожидания и ручной обработки. Обычно это занимает от 30 секунд до 5 минут.",
      },
      {
        q: "Ключ не пришёл на email. Что делать?",
        a: "1) Проверьте папку «Спам» — письмо от Digiseller могло туда попасть. 2) Убедитесь, что email указан верно. 3) Войдите на сайт Digiseller.ru с вашим аккаунтом — все покупки хранятся там. 4) Если проблема не решилась — напишите нам на support@gameplaza.site.",
      },
      {
        q: "Где хранятся мои покупки?",
        a: "Все ваши покупки доступны в личном кабинете Digiseller.ru. Также история заказов отображается в вашем профиле на нашем сайте.",
      },
    ],
  },
  {
    category: "Активация ключей",
    items: [
      {
        q: "Как активировать ключ Steam?",
        a: "1) Откройте Steam и войдите в аккаунт. 2) Нажмите «Добавить игру» → «Активировать продукт в Steam». 3) Введите полученный ключ. Или зайдите на store.steampowered.com/account/registerkey и введите ключ там.",
      },
      {
        q: "Как активировать ключ Xbox / Microsoft?",
        a: "Зайдите на redeem.microsoft.com, войдите в аккаунт Microsoft и введите 25-символьный ключ. Либо откройте Microsoft Store на Xbox и выберите «Использовать код».",
      },
      {
        q: "Как активировать ключ PlayStation?",
        a: "Зайдите в PlayStation Store (на консоли или через браузер на store.playstation.com), выберите пункт «Использовать код» и введите ключ.",
      },
      {
        q: "В какой стране работает ключ?",
        a: "Регион ключа всегда указан в описании товара. Убедитесь, что регион вашего аккаунта совпадает с регионом ключа. При несовпадении ключ может не активироваться.",
      },
    ],
  },
  {
    category: "Гарантия и возврат",
    items: [
      {
        q: "Что делать, если ключ не работает?",
        a: "Напишите нам на support@gameplaza.site с темой «Нерабочий ключ» и приложите: скриншот ошибки, номер заказа, название товара. Мы заменим ключ или вернём деньги в течение 24 часов.",
      },
      {
        q: "Возможен ли возврат денег?",
        a: "Возврат возможен, если ключ оказался нерабочим или не подходит по региону (если регион был указан неверно с нашей стороны). Активированные ключи возврату не подлежат — это стандартная политика для цифровых товаров.",
      },
      {
        q: "Ключ уже кто-то активировал. Что делать?",
        a: "Это редкий случай, но если такое произошло — немедленно напишите нам. Мы заменим ключ в приоритетном порядке. Приложите скриншот ошибки активации.",
      },
    ],
  },
  {
    category: "Аккаунт и профиль",
    items: [
      {
        q: "Нужно ли регистрироваться для покупки?",
        a: "Нет, покупать можно без регистрации через Digiseller. Но аккаунт на нашем сайте даёт доступ к истории заказов, списку желаний и более удобному управлению покупками.",
      },
      {
        q: "Как сбросить пароль?",
        a: "На странице входа нажмите «Забыли пароль?», введите email и мы отправим ссылку для сброса. Ссылка действительна 1 час.",
      },
      {
        q: "Как подтвердить email?",
        a: "После регистрации на указанный email придёт письмо со ссылкой для подтверждения. Если письмо не пришло — проверьте папку «Спам» или напишите нам.",
      },
    ],
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#1f2937] last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left py-4 flex items-center justify-between gap-4 group"
      >
        <span className="text-white text-sm font-medium group-hover:text-brand transition-colors">{q}</span>
        <svg
          className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="pb-4 text-gray-400 text-sm leading-relaxed">
          {a}
        </div>
      )}
    </div>
  )
}

export default function HelpClient() {
  const [search, setSearch] = useState("")

  const filtered = search.trim().length > 1
    ? FAQS.map(cat => ({
        ...cat,
        items: cat.items.filter(
          item =>
            item.q.toLowerCase().includes(search.toLowerCase()) ||
            item.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : FAQS

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Заголовок */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-3">Центр помощи</h1>
        <p className="text-gray-400">Ответы на частые вопросы о покупке и активации цифровых товаров</p>
      </div>

      {/* Поиск по FAQ */}
      <div className="relative mb-10">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по вопросам..."
          className="gp-input pl-10 py-3"
        />
      </div>

      {/* FAQ разделы */}
      {filtered.length > 0 ? (
        <div className="space-y-6">
          {filtered.map(cat => (
            <div key={cat.category} className="card p-5">
              <h2 className="text-brand font-semibold text-sm uppercase tracking-wider mb-4">{cat.category}</h2>
              <div>
                {cat.items.map(item => (
                  <FaqItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-white font-medium mb-1">Ничего не найдено</p>
          <p className="text-gray-500 text-sm">Попробуйте другой запрос или напишите нам напрямую</p>
        </div>
      )}

      {/* Не нашли ответ */}
      <div className="mt-10 card p-6 text-center">
        <div className="text-3xl mb-3">💬</div>
        <h3 className="text-white font-semibold mb-2">Не нашли ответ?</h3>
        <p className="text-gray-400 text-sm mb-5">
          Напишите нам — ответим в течение нескольких часов
        </p>
        <a
          href="mailto:support@gameplaza.site"
          className="btn-primary px-6 py-3 inline-flex"
        >
          ✉ Написать в поддержку
        </a>
        <p className="text-gray-600 text-xs mt-3">support@gameplaza.site</p>
      </div>

      {/* Быстрые ссылки */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/catalog" className="btn-outline text-sm px-4 py-2">Каталог товаров</Link>
        <Link href="/about" className="btn-outline text-sm px-4 py-2">О нас</Link>
        <Link href="/auth/login" className="btn-outline text-sm px-4 py-2">Войти в аккаунт</Link>
      </div>
    </div>
  )
}
