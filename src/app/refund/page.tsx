import type { Metadata } from "next"

export const metadata: Metadata = {
  title: { absolute: "Политика возврата | GamePlaza" },
  description: "Условия возврата средств и обмена цифровых товаров в GamePlaza",
  alternates: { canonical: "/refund" },
}

export default function RefundPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Политика возврата</h1>
      <p className="text-gray-500 text-sm mb-8">Последнее обновление: июнь 2026 г.</p>

      <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-5 mb-10">
        <p className="text-emerald-400 font-medium text-sm">Мы стремимся к 100% удовлетворённости покупателей. Если с товаром возникла проблема — обратитесь в поддержку, и мы решим вопрос.</p>
      </div>

      <div className="space-y-8 text-gray-300 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Когда возможен возврат</h2>
          <ul className="space-y-2 text-gray-400">
            <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#10003;</span> Ключ активации не работает (подтверждено скриншотом ошибки)</li>
            <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#10003;</span> Товар не соответствует описанию на сайте</li>
            <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#10003;</span> Ключ не был доставлен из-за технического сбоя</li>
            <li className="flex gap-2"><span className="text-emerald-400 shrink-0">&#10003;</span> Двойное списание средств за один заказ</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Когда возврат невозможен</h2>
          <ul className="space-y-2 text-gray-400">
            <li className="flex gap-2"><span className="text-red-400 shrink-0">&#10007;</span> Ключ уже активирован в аккаунте платформы</li>
            <li className="flex gap-2"><span className="text-red-400 shrink-0">&#10007;</span> Прошло более 7 дней с момента покупки</li>
            <li className="flex gap-2"><span className="text-red-400 shrink-0">&#10007;</span> Передумали покупать (субъективная причина)</li>
            <li className="flex gap-2"><span className="text-red-400 shrink-0">&#10007;</span> Регион активации не совпадает (регион указан в описании товара)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Как оформить возврат</h2>
          <ol className="space-y-3 text-gray-400">
            <li className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-brand/20 text-brand text-xs flex items-center justify-center font-bold">1</span>Напишите в поддержку через <a href="/profile" className="text-brand hover:underline">раздел «Тикеты»</a> или на email</li>
            <li className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-brand/20 text-brand text-xs flex items-center justify-center font-bold">2</span>Укажите номер заказа и опишите проблему</li>
            <li className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-brand/20 text-brand text-xs flex items-center justify-center font-bold">3</span>Приложите скриншот ошибки активации</li>
            <li className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-brand/20 text-brand text-xs flex items-center justify-center font-bold">4</span>Мы рассмотрим обращение в течение 24 часов</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Сроки возврата средств</h2>
          <p className="text-gray-400">При подтверждении возврата средства зачисляются на баланс аккаунта GamePlaza в течение <strong className="text-white">24 часов</strong>. Баланс можно использовать для следующей покупки.</p>
        </section>

        <section className="border-t border-gray-800 pt-8">
          <h2 className="text-lg font-semibold text-white mb-3">Контакты поддержки</h2>
          <p className="text-gray-400">Email: <a href="mailto:support@gameplaza.site" className="text-brand hover:underline">support@gameplaza.site</a></p>
          <p className="text-gray-400 mt-1">Время работы: ежедневно 9:00–21:00 МСК</p>
        </section>

      </div>
    </div>
  )
}