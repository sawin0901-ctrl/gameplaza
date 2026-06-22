import type { Metadata } from "next"

export const metadata: Metadata = {
  title: { absolute: "Условия использования | GamePlaza" },
  description: "Условия использования сервиса GamePlaza — правила покупки цифровых товаров, ключей и подписок.",
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Условия использования</h1>
      <p className="text-gray-500 text-sm mb-10">Последнее обновление: июнь 2025</p>

      <div className="space-y-8 text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">1. Общие положения</h2>
          <p>Используя сайт GamePlaza, вы соглашаетесь соблюдать настоящие Условия использования. Если вы не согласны с какими-либо условиями, пожалуйста, не пользуйтесь нашим сервисом.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">2. Описание сервиса</h2>
          <p>GamePlaza — это цифровой магазин, предоставляющий услуги по продаже лицензионных ключей активации, подписок и других цифровых товаров для видеоигр и программного обеспечения.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">3. Регистрация и аккаунт</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li>Для совершения покупок необходима регистрация с действующим адресом электронной почты.</li>
            <li>Вы несёте ответственность за сохранность данных для входа в аккаунт.</li>
            <li>Запрещено создавать несколько аккаунтов для злоупотребления акциями и бонусами.</li>
            <li>Администрация вправе заблокировать аккаунт при нарушении правил.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">4. Покупка и доставка товаров</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li>Все товары являются цифровыми и доставляются мгновенно после оплаты.</li>
            <li>Ключи активации передаются в личный кабинет покупателя.</li>
            <li>После активации ключа возврат средств невозможен.</li>
            <li>В случае технических проблем с активацией обращайтесь в службу поддержки.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">5. Оплата</h2>
          <p>Оплата производится в рублях РФ. Мы принимаем банковские карты и электронные кошельки. Все транзакции защищены SSL-шифрованием.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">6. Запрещённые действия</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li>Перепродажа приобретённых товаров запрещена без письменного согласия администрации.</li>
            <li>Попытки взлома, обхода защиты или автоматизированного сбора данных запрещены.</li>
            <li>Использование купленных товаров в коммерческих целях без лицензии запрещено.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">7. Ответственность</h2>
          <p>GamePlaza не несёт ответственности за действия платформ-производителей (Steam, Microsoft, Sony и др.) в отношении активированных ключей. Мы гарантируем работоспособность ключей на момент продажи.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">8. Изменения условий</h2>
          <p>Мы вправе изменять настоящие Условия в любое время. О существенных изменениях пользователи будут уведомлены по электронной почте.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">9. Контакты</h2>
          <p>По всем вопросам, связанным с условиями использования, обращайтесь через раздел <a href="/help" className="text-purple-400 hover:underline">Помощь</a>.</p>
        </section>
      </div>
    </div>
  )
}