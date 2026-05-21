import { cn } from '@/lib/utils';

export default async function Imprint() {
  return (
    <div className="w-full mt-10 mb-10">
      <section className={cn('max-w-4xl w-full mx-auto ', 'px-4 sm:px-6 lg:px-8')}>
        <h1>Impressum</h1>

        <p>Angaben gemäß § 5 TMG</p>

        <h2 className="mt-4">Betreiber der Plattform</h2>

        <div>
          <p>
            Hendrike Heydenreich
            <br />
            Witts Allee 34
            <br />
            22587 Hamburg
            <br />
            Deutschland
          </p>

          <p>
            E-Mail: <a href="mailto:mail@gretalee.de">mail@gretalee.de</a>
          </p>
        </div>

        <h2 className="mt-4">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>

        <p>
          Hendrike Heydenreich
          <br />
          Witts Allee 34
          <br />
          22587 Hamburg
          <br />
          Deutschland
        </p>

        <h2 className="mt-4">Haftung für Inhalte</h2>

        <p>
          Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt. Für die
          Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine
          Gewähr übernehmen.
        </p>

        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen
          Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind
          wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
          gespeicherte fremde Informationen zu überwachen.
        </p>

        <h2 className="mt-4">Haftung für Links</h2>

        <p>
          Diese Website enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir
          keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine
          Gewähr übernehmen.
        </p>

        <h2 className="mt-4">Urheberrecht</h2>

        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf dieser Website
          unterliegen dem deutschen Urheberrecht.
        </p>

        <p>
          Von Nutzern eingestellte Inhalte verbleiben im Verantwortungsbereich der
          jeweiligen Nutzer.
        </p>

        <h2 className="mt-4">Hinweis zu nutzergenerierten Inhalten</h2>

        <p>
          Pillyway ist eine gemeinschaftlich gepflegte Plattform für Pilgerwege und
          Wanderinformationen.
        </p>

        <p>
          Für von Nutzern erstellte Inhalte, Routenbeschreibungen, Unterkünfte,
          Wegempfehlungen oder sonstige Angaben übernehmen wir keine Gewähr hinsichtlich:
        </p>

        <ul className="list-disc py-2 pl-6">
          <li>Vollständigkeit,</li>
          <li>Richtigkeit,</li>
          <li>Aktualität,</li>
          <li>Sicherheit oder Begehbarkeit von Wegen.</li>
        </ul>

        <p>
          Die Nutzung der bereitgestellten Informationen erfolgt auf eigene Verantwortung.
        </p>

        <h2 className="mt-4">Open Source</h2>

        <p>
          Pillyway ist ein Open-Source-Projekt und wird unter der MIT-Lizenz
          veröffentlicht.
        </p>

        <p>Der Quellcode ist öffentlich zugänglich.</p>

        <h2 className="mt-4">Kontakt</h2>

        <p>Bei Fragen, Hinweisen oder rechtlichen Anliegen kontaktieren Sie bitte:</p>

        <p>
          <a href="mailto:mail@gretalee.de">mail@gretalee.de</a>
        </p>
      </section>
    </div>
  );
}
