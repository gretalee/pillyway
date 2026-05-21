import { cn } from '@/lib/utils';

export default async function Privacy() {
  return (
    <div className="w-full mt-10 mb-10">
      <section className={cn('max-w-4xl w-full mx-auto ', 'px-4 sm:px-6 lg:px-8')}>
        <h1>Datenschutzerklärung</h1>

        <p>
          Diese Datenschutzerklärung informiert über die Art, den Umfang und den Zweck der
          Verarbeitung personenbezogener Daten innerhalb der Webanwendung Pillyway.
        </p>

        <h2 className="mt-4">1. Verantwortlicher</h2>

        <p>
          Hendrike Heydenreich
          <br />
          Witts Allee 34, 22587 Hamburg
          <br />
          Deutschland
        </p>

        <p>
          E-Mail: <a href="mailto:mail@gretalee.de">mail@gretalee.de</a>
        </p>

        <h2 className="mt-4">2. Allgemeine Hinweise zur Datenverarbeitung</h2>

        <p>
          Wir verarbeiten personenbezogene Daten der Nutzer grundsätzlich nur, soweit dies
          zur Bereitstellung einer funktionsfähigen Website sowie unserer Inhalte und
          Leistungen erforderlich ist.
        </p>

        <h2 className="mt-4">3. Welche Daten verarbeitet werden</h2>

        <p>
          Beim Besuch und der Nutzung von Pillyway können folgende Daten verarbeitet
          werden:
        </p>

        <ul className="list-disc py-2 pl-6">
          <li>E-Mail-Adresse</li>
          <li>Benutzername</li>
          <li>IP-Adresse</li>
          <li>Technische Logdaten</li>
          <li>Account- und Sitzungsdaten</li>
          <li>Von Nutzern erstellte Inhalte (Routen, Kommentare, Unterkünfte etc.)</li>
        </ul>

        <h2 className="mt-4">4. Registrierung und Benutzerkonto</h2>

        <p>
          Nutzer können ein Benutzerkonto erstellen, um Inhalte beizutragen und bestehende
          Inhalte zu bearbeiten.
        </p>

        <p>
          Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO zur
          Bereitstellung der Plattformfunktionen.
        </p>

        <h2 className="mt-4">5. Speicherung nutzergenerierter Inhalte</h2>

        <p>
          Inhalte, die Nutzer auf Pillyway veröffentlichen, können öffentlich sichtbar
          sein.
        </p>

        <p>
          Bitte veröffentlichen Sie keine sensiblen personenbezogenen Daten innerhalb
          öffentlicher Inhalte.
        </p>

        <h2 className="mt-4">6. Hosting und Datenbank</h2>

        <p>Pillyway verwendet Supabase als Hosting- und Datenbankdienstleister.</p>

        <p>
          Dabei können personenbezogene Daten auf Servern von Supabase verarbeitet werden.
        </p>

        <p>
          Weitere Informationen:
          <a
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noopener noreferrer">
            https://supabase.com/privacy
          </a>
        </p>

        <h2 className="mt-4">7. Server-Logfiles</h2>

        <p>
          Beim Aufruf der Website werden automatisch Informationen durch den Browser
          übermittelt.
        </p>

        <p>Dies umfasst unter anderem:</p>

        <ul className="list-disc py-2 pl-6">
          <li>IP-Adresse</li>
          <li>Datum und Uhrzeit der Anfrage</li>
          <li>Browsertyp</li>
          <li>Betriebssystem</li>
          <li>Referrer-URL</li>
        </ul>

        <p>
          Diese Daten dienen ausschließlich der technischen Sicherheit und Stabilität der
          Plattform.
        </p>

        <h2 className="mt-4">8. Cookies</h2>

        <p>
          Pillyway verwendet technisch notwendige Cookies und Session-Daten, die für den
          Betrieb der Plattform erforderlich sind.
        </p>

        <p>
          Diese Cookies dienen beispielsweise der Anmeldung und Authentifizierung von
          Nutzern.
        </p>

        <p>Es erfolgt kein Einsatz von Werbe- oder Marketing-Cookies.</p>

        <h2 className="mt-4">9. Rechtsgrundlagen der Verarbeitung</h2>

        <p>Die Verarbeitung personenbezogener Daten erfolgt auf Grundlage von:</p>

        <ul className="list-disc py-2 pl-6">
          <li>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</li>
          <li>Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)</li>
        </ul>

        <h2 className="mt-4">10. Rechte der betroffenen Personen</h2>

        <p>Nutzer haben nach der DSGVO insbesondere folgende Rechte:</p>

        <ul className="list-disc py-2 pl-6">
          <li>Auskunft über gespeicherte Daten</li>
          <li>Berichtigung unrichtiger Daten</li>
          <li>Löschung personenbezogener Daten</li>
          <li>Einschränkung der Verarbeitung</li>
          <li>Datenübertragbarkeit</li>
          <li>Widerspruch gegen die Verarbeitung</li>
        </ul>

        <p>
          Anfragen hierzu können jederzeit an die oben genannte Kontaktadresse gerichtet
          werden.
        </p>

        <h2 className="mt-4">11. Speicherdauer</h2>

        <p>
          Personenbezogene Daten werden nur so lange gespeichert, wie dies für den
          jeweiligen Zweck erforderlich ist oder gesetzliche Aufbewahrungspflichten
          bestehen.
        </p>

        <h2 className="mt-4">12. Datensicherheit</h2>

        <p>
          Wir treffen technische und organisatorische Maßnahmen, um personenbezogene Daten
          gegen Verlust, Manipulation und unberechtigten Zugriff zu schützen.
        </p>

        <h2 className="mt-4">13. Änderungen dieser Datenschutzerklärung</h2>

        <p>
          Diese Datenschutzerklärung kann angepasst werden, wenn sich technische oder
          rechtliche Anforderungen ändern.
        </p>

        <h2 className="mt-4">14. Kontakt</h2>

        <p>Bei Fragen zum Datenschutz kontaktieren Sie bitte:</p>

        <p>
          <a href="mailto:mail@gretalee.de">mail@gretalee.de</a>
        </p>
      </section>
    </div>
  );
}
