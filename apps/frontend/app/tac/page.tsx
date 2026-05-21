import { cn } from '@/lib/utils';

export default async function TermsAndConditions() {
  return (
    <div className="w-full mt-10 mb-10">
      <section className={cn('max-w-4xl w-full mx-auto ', 'px-4 sm:px-6 lg:px-8')}>
        <h1>Nutzungsbedingungen</h1>

        <p>
          Diese Nutzungsbedingungen regeln die Nutzung der Webanwendung Pillyway. Durch
          die Nutzung der Plattform erklären Sie sich mit diesen Bedingungen
          einverstanden.
        </p>

        <h2 className="mt-4">1. Zweck der Plattform</h2>

        <p>
          Pillyway ist eine kollaborative Plattform zur Dokumentation, Planung und
          Verbesserung von Pilger- und Wanderwegen in Europa.
        </p>

        <p>Inhalte werden gemeinschaftlich von Nutzern erstellt und gepflegt.</p>

        <h2 className="mt-4">2. Nutzerkonto</h2>

        <p>
          Für bestimmte Funktionen (z. B. das Erstellen und Bearbeiten von Routen) ist ein
          Nutzerkonto erforderlich.
        </p>

        <p>Nutzer sind verpflichtet, ihre Zugangsdaten vertraulich zu behandeln.</p>

        <h2 className="mt-4">3. Nutzerinhalte</h2>

        <p>
          Nutzer können Inhalte wie Routen, Etappen, Unterkünfte und Sehenswürdigkeiten
          veröffentlichen.
        </p>

        <p>
          Mit dem Einstellen von Inhalten räumen Nutzer Pillyway ein einfaches, zeitlich
          und räumlich unbegrenztes Nutzungsrecht ein, diese Inhalte im Rahmen der
          Plattform darzustellen und zu verbreiten.
        </p>

        <p>Nutzer sind selbst verantwortlich für die von ihnen erstellten Inhalte.</p>

        <h2 className="mt-4">4. Verbotene Inhalte</h2>

        <p>Es ist untersagt, Inhalte zu veröffentlichen, die insbesondere:</p>

        <ul className="list-disc py-2 pl-6">
          <li>rechtswidrig sind</li>
          <li>beleidigend, diskriminierend oder gewaltverherrlichend sind</li>
          <li>
            falsche oder irreführende Informationen enthalten (z. B. absichtlich falsche
            Routen)
          </li>
          <li>Urheberrechte oder Rechte Dritter verletzen</li>
          <li>Spam oder Werbung ohne Genehmigung enthalten</li>
        </ul>

        <h2 className="mt-4">5. Keine Gewähr für Inhalte</h2>

        <p>
          Die Inhalte auf Pillyway werden von Nutzern erstellt und gepflegt. Daher
          übernehmen wir keine Gewähr für:
        </p>

        <ul className="list-disc py-2 pl-6">
          <li>Richtigkeit</li>
          <li>Vollständigkeit</li>
          <li>Aktualität</li>
          <li>Sicherheit oder Begehbarkeit von Wegen</li>
        </ul>

        <p>Die Nutzung der Informationen erfolgt auf eigene Verantwortung.</p>

        <h2 className="mt-4">6. Verifizierung von Routen</h2>

        <p>
          Routen können durch die Community als „verifiziert“ markiert werden, wenn sie
          von mehreren Nutzern bestätigt wurden.
        </p>

        <p>
          Auch verifizierte Inhalte stellen keine Garantie für die tatsächliche
          Begehbarkeit oder Sicherheit eines Weges dar.
        </p>

        <h2 className="mt-4">7. Moderation und Entfernung von Inhalten</h2>

        <p>
          Pillyway behält sich das Recht vor, Inhalte zu bearbeiten, zu verschieben oder
          zu entfernen, wenn diese gegen diese Nutzungsbedingungen verstoßen oder
          ungeeignet sind.
        </p>

        <p>Nutzerkonten können bei wiederholten Verstößen gesperrt werden.</p>

        <h2 className="mt-4">8. Haftung</h2>

        <p>
          Pillyway haftet nur für Schäden, die auf vorsätzlicher oder grob fahrlässiger
          Pflichtverletzung beruhen.
        </p>

        <p>
          Eine Haftung für die Nutzung der bereitgestellten Inhalte, insbesondere im
          Zusammenhang mit Wander- oder Pilgerwegen, ist ausgeschlossen, soweit gesetzlich
          zulässig.
        </p>

        <h2 className="mt-4">9. Änderungen der Nutzungsbedingungen</h2>

        <p>
          Pillyway behält sich vor, diese Nutzungsbedingungen zu ändern, sofern dies
          erforderlich ist.
        </p>

        <p>Nutzer werden über wesentliche Änderungen informiert.</p>

        <h2 className="mt-4">10. Open Source Hinweis</h2>

        <p>
          Pillyway ist ein Open-Source-Projekt und wird unter der MIT-Lizenz
          veröffentlicht. Der Quellcode ist öffentlich einsehbar.
        </p>

        <h2 className="mt-4">11. Kontakt</h2>

        <p>Bei Fragen zu diesen Nutzungsbedingungen kontaktieren Sie bitte:</p>

        <p>
          <a href="mailto:mail@gretalee.de">mail@gretalee.de</a>
        </p>
      </section>
    </div>
  );
}
