import type { Metadata } from "next"

export const metadata: Metadata = {
  title: { absolute: "Политика конфиденциальности | GamePlaza" },
  description: "Политика конфиденциальности и обработки персональных данных GamePlaza",
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Политика конфиденциальности</h1>
      <p className="text-gray-500 text-sm mb-10">Последнее обновление: июнь 2026 г.</p>

      <div className="space-y-8 text-gray-300 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">1. Общие положения</h2>
          <p>Настоящая Политика определяет порядок обработки и защиты персональных данных пользователей интернет-магазина GamePlaza (gameplaza.site). Используя сайт, вы соглашаетесь с условиями настоящей Политики.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">2. Собираемые данные</h2>
          <ul className="list-disc list-inside space-y-1.5 text-gray-400">
            <li>Адрес электронной почты и имя пользователя при регистрации</li>
            <li>Данные о заказах и покупках</li>
            <li>IP-адрес, тип браузера, страницы посещений</li>
            <li>Файлы cookie для хранения сессии и настроек</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">3. Цели обработки данных</h2>
          <ul className="list-disc list-inside space-y-1.5 text-gray-400">
            <li>Обработка заказов и доставка цифровых товаров</li>
            <li>Техническая поддержка пользователей</li>
            <li>Отправка уведомлений о статусе заказа</li>
            <li>Защита от мошенничества и несанкционированного доступа</li>
            <li>Анализ и улучшение работы сервиса</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">4. Передача данных третьим лицам</h2>
          <p className="text-gray-400">Мы не продаём и не передаём персональные данные третьим лицам, за исключением случаев, необходимых для выполнения заказа: платёжные системы и платформа Digiseller для обработки продаж цифровых товаров.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">5. Файлы cookie</h2>
          <p className="text-gray-400">Сайт использует cookies для хранения данных сессии и пользовательских настроек (тема, язык). Вы можете отключить cookies в браузере, однако это может повлиять на корректность работы сайта.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">6. Безопасность данных</h2>
          <p className="text-gray-400">Применяются технические меры защиты: шифрование соединения (HTTPS), хеширование паролей (bcrypt), ограниченный доступ к базе данных. Данные хранятся на защищённых серверах.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">7. Права пользователей</h2>
          <p className="text-gray-400">Вы вправе запросить доступ, исправление или удаление ваших персональных данных, направив запрос на <a href="mailto:support@gameplaza.site" className="text-brand hover:underline">support@gameplaza.site</a>. Запрос будет обработан в течение 30 дней.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">8. Изменения политики</h2>
          <p className="text-gray-400">Мы можем обновлять настоящую Политику. О существенных изменениях уведомляем по электронной почте или через уведомление на сайте.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">9. Контакты</h2>
          <p className="text-gray-400">По вопросам обработки персональных данных: <a href="mailto:support@gameplaza.site" className="text-brand hover:underline">support@gameplaza.site</a></p>
        </section>

      </div>
    </div>
  )
}