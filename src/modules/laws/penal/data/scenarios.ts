import type { PenalScenario } from './types';

export const PENAL_SCENARIOS: readonly PenalScenario[] = [
  // === A. Majetková trestná činnost ===
  {
    id: 'penal.scenario.A1',
    ref: 'A1',
    prompt:
      'Pachatel vešel do obchodu s mlékem na Innocence Boulevard, přiložil prodavači nůž ke krku a nechal si vyplatit 15 000 USD z pokladny. Po krátké výhrůžce odešel a před zásahem hlídky se vzdal.',
    expected: [
      { paragraphId: 'penal.26', subId: 'a' },
      { paragraphId: 'penal.14', subId: 'a' },
    ],
    educationalNote:
      '§25 Krádež se nepřičítá — krádež je subsumována pod loupež, protože šlo o získání věci násilím / pohrůžkou.',
  },
  {
    id: 'penal.scenario.A2',
    ref: 'A2',
    prompt:
      'Pachatel se vloupal do rodinného domu v Rockford Hills a uvnitř pobíral elektroniku v hodnotě cca 40 000 USD. Pachatel měl do teď čistý trestní rejstřík.',
    expected: [
      { paragraphId: 'penal.29', subId: 'a' },
      { paragraphId: 'penal.25', subId: 'b' },
    ],
    educationalNote:
      'NPC dům není registrovaný dle 004-21, takže §29a (ne §29c). Hodnota 40 K spadá do 20–200 K → §25b.',
  },
  {
    id: 'penal.scenario.A3',
    ref: 'A3',
    prompt:
      'Pachatel rozbil okno zaparkované Tampy a odjel s ní. Při zastavení hlídkou v ní jel bez řidičského oprávnění (MDT záznam: dnes už stejnou činnost udělal).',
    expected: [
      { paragraphId: 'penal.27' },
      { paragraphId: 'penal.35', subId: 'b' },
    ],
    educationalNote:
      '§27 vs. §25: vozidlo je explicitně řešeno §27 (pokuta 3 K), §25 se nepoužije, i když by hodnota přesáhla 200 K. Opakování bez ŘP v 14 dnech → §35b.',
  },
  {
    id: 'penal.scenario.A4',
    ref: 'A4',
    prompt:
      "Pachatel poškrábal hřebíkem 4 zaparkovaná auta na parkovišti u Cluckin' Bell, škoda odhadem 8 000 USD. Když ho jeden majitel vozu konfrontoval, vyhrožoval mu zabitím.",
    expected: [
      { paragraphId: 'penal.32', subId: 'a' },
      { paragraphId: 'penal.15', subId: 'a' },
    ],
  },
  {
    id: 'penal.scenario.A5',
    ref: 'A5',
    prompt:
      'Pachatel hodil zápalnou láhev do prázdné opuštěné benzínové pumpy v Sandy Shores. Plameny se rozšířily na sousední dílnu.',
    expected: [{ paragraphId: 'penal.33' }],
  },
  {
    id: 'penal.scenario.A6',
    ref: 'A6',
    prompt:
      'Pachatel byl vyveden z opuštěného domu v Sandy Shores před 5 dny (záznam v MDT). Dnes ho hlídka nachází znovu uvnitř téhož domu — vstoupil rozbitým zadním oknem.',
    expected: [{ paragraphId: 'penal.29', subId: 'b' }],
    educationalNote:
      '§29b (ne §29c) — dům je NPC, takže není registrovaný dle 004-21, ale je tu jasné opakování v 14denním okně. §29b absorbuje samostatný §29a z prvního vstupu.',
  },

  // === B. Doprava ===
  {
    id: 'penal.scenario.B1',
    ref: 'B1',
    prompt:
      'Hlídka zastavila řidiče po projetí semaforu na červenou na křižovatce Vinewood Blvd. MDT prověření odhalilo, že nemá vydaný řidičský průkaz. Nikdy předtím nic podobného nespáchal.',
    expected: [
      { paragraphId: 'penal.42' },
      { paragraphId: 'penal.35', subId: 'a' },
    ],
  },
  {
    id: 'penal.scenario.B2',
    ref: 'B2',
    prompt:
      'Radar zaznamenal řidiče Sultan jedoucího 95 mph na Senora Highway. MDT záznam ukazuje žádné citace za posledních 14 dní.',
    expected: [{ paragraphId: 'penal.37', subId: 'b' }],
  },
  {
    id: 'penal.scenario.B3',
    ref: 'B3',
    prompt:
      'Stejný řidič zastaven podruhé za 24 hodin za jízdu 110 mph na Senora Highway. V MDT už eviduje 2 obdobné citace v posledních 14 dnech.',
    expected: [{ paragraphId: 'penal.37', subId: 'c' }],
  },
  {
    id: 'penal.scenario.B4',
    ref: 'B4',
    prompt:
      'Hlídka zastavila řidiče za jízdu 51 mph v downtownu. Při kontrole cítit alkohol; field sobriety test pozitivní.',
    expected: [
      { paragraphId: 'penal.37', subId: 'a' },
      { paragraphId: 'penal.36' },
    ],
  },
  {
    id: 'penal.scenario.B5',
    ref: 'B5',
    prompt:
      'Hlídka zapnula maják na řidiče za projetí stop značky. Řidič přidal plyn a 5 minut ujížděl, než se vzdal. MDT odhalilo, že nemá řidičský průkaz.',
    expected: [
      { paragraphId: 'penal.58', subId: 'b' },
      { paragraphId: 'penal.35', subId: 'a' },
    ],
    educationalNote:
      '§42 (projetí stop značky) se nepřičítá — útěk jako vážnější čin absorbuje předchozí dopravní přestupek, který ho odstartoval.',
  },
  {
    id: 'penal.scenario.B6',
    ref: 'B6',
    prompt:
      'Řidič nedal přednost na křižovatce a narazil do předjíždějícího vozu. Druhý řidič odvezen do nemocnice s hmožděnou rukou.',
    expected: [
      { paragraphId: 'penal.34', subId: 'b' },
      { paragraphId: 'penal.42' },
    ],
  },
  {
    id: 'penal.scenario.B7',
    ref: 'B7',
    prompt:
      'Hlídka zastavila řidiče Bestia GTS, která neměla dveře řidičovy strany ani čelní sklo. Vozidlo neprošlo letošní technickou kontrolou.',
    expected: [{ paragraphId: 'penal.40' }],
  },

  // === C. Drogy ===
  {
    id: 'penal.scenario.C1',
    ref: 'C1',
    prompt:
      'Při kontrole vozu nalezeno 15 g marihuany ve vakuum-zataveném sáčku v přihrádce u řidiče.',
    expected: [{ paragraphId: 'penal.51', subId: 'b' }],
  },
  {
    id: 'penal.scenario.C2',
    ref: 'C2',
    prompt:
      'Při výjezdu k požárnímu poplachu na rodinný dům objevili hasiči ve sklepě pěstírnu se 30 vzrostlými keři marihuany. Vážení vyšlo na 850 g.',
    expected: [{ paragraphId: 'penal.49', subId: 'b' }],
  },
  {
    id: 'penal.scenario.C3',
    ref: 'C3',
    prompt:
      'Pod-cover operace zachytila pachatele při prodeji 30 g kokainu klientovi na parkovišti za Casino. Při zatčení vytáhl Combat Pistol — nemá vydaný žádný zbrojní průkaz.',
    expected: [
      { paragraphId: 'penal.52', subId: 'a' },
      { paragraphId: 'penal.46', subId: 'a' },
    ],
  },
  {
    id: 'penal.scenario.C4',
    ref: 'C4',
    prompt:
      'Při kontrole vozu nalezeno u řidiče 8 g kokainu v sáčku v boční kapse bundy.',
    expected: [{ paragraphId: 'penal.50', subId: 'b' }],
    educationalNote:
      '§50 (ne §51) — kokain spadá do drog kategorie A–E mimo marihuanu. §51 pokrývá výhradně marihuanu, která má jinou škálu (přestupek od 6 g, tr. čin od 12 g). Edukační kontrast §50 vs. §51.',
  },

  // === D. Zbraně (bez střelby) ===
  {
    id: 'penal.scenario.D2',
    ref: 'D2',
    prompt:
      'Hlídka při kontrole odhalila, že pachatel má pod bundou ballistickou vestu. Předložil platný zbrojní průkaz T1, vesta je v autě s ním.',
    expected: [{ paragraphId: 'penal.46', subId: 'b' }],
    educationalNote:
      'Hlavní edukační moment: i platný ZP T1/T2/T3 NEUMOŽŇUJE nosit ballistickou vestu. Výjimku má jen on-duty ozbrojený personál. Vesta je oděvní doplněk mimo §3 FA, dle §5d → §46b.',
  },
  {
    id: 'penal.scenario.D3',
    ref: 'D3',
    prompt:
      'Při kontrole vozu nalezena u řidiče Pistol pod sedadlem. Řidič předložil platný ZP T1, ale zbraň není v centrální registraci. Sériové číslo je čitelné.',
    expected: [{ paragraphId: 'penal.47' }],
    educationalNote:
      '§47 (ne §46), protože pachatel MÁ ZP — porušuje jen registrační povinnost dle §14 FA, ne licenční. Druhý edukační moment kontrastu §46/§47.',
  },

  // === E. Násilí, omezování svobody, střelba ===
  {
    id: 'penal.scenario.E1',
    ref: 'E1',
    prompt:
      'V baru Pacific Bluffs se strhla potyčka. Pachatel pěstí udeřil hosta a způsobil mu zlomený nos. Host odvezen na pohotovost.',
    expected: [{ paragraphId: 'penal.8', subId: 'c' }],
  },
  {
    id: 'penal.scenario.E2',
    ref: 'E2',
    prompt:
      'Pachatel po hádce na ulici vytáhl baseballovou pálku a opakovaně udeřil oběť do hlavy. Oběť v bezvědomí, převezena do nemocnice.',
    expected: [{ paragraphId: 'penal.7', subId: 'b' }],
    educationalNote:
      '§7 (ne §8) — protože byla použita zbraň. Pálka je zbraň ve smyslu Penal Code (každý předmět způsobilý k útoku).',
  },
  {
    id: 'penal.scenario.E3',
    ref: 'E3',
    prompt:
      'Při běžné kontrole identifikace pachatel udeřil pěstí strážníka SASP do tváře a snažil se ho povalit. Strážník zafixoval pachatele za pomoci dalšího kolegy.',
    expected: [{ paragraphId: 'penal.8', subId: 'b' }],
  },
  {
    id: 'penal.scenario.E4',
    ref: 'E4',
    prompt:
      'Pachatel v noci přepadl ženu při východu z restaurace, vtáhl ji do dodávky a odjel. Po hodině auto zastavil v opuštěné lokalitě, ale oběť stačila utéct.',
    expected: [{ paragraphId: 'penal.14', subId: 'b' }],
  },
  {
    id: 'penal.scenario.E5',
    ref: 'E5',
    prompt:
      'Pachatel v noci unesl ženu z parkoviště a v kufru auta jí oznámil, že pokud její rodina nezaplatí 50 000 USD výkupné, zabije ji.',
    expected: [
      { paragraphId: 'penal.14', subId: 'b' },
      { paragraphId: 'penal.16' },
    ],
  },
  {
    id: 'penal.scenario.E6',
    ref: 'E6',
    prompt:
      'Při výjezdu k volání 10-32 střelci v Davis začali pachatelé střílet po přijíždějící sanitce EMS a dalších 5 lidech z dlouhé střelné zbraně. Záchranář byl střelen do ramene a převezen v kritickém stavu.',
    expected: [
      { paragraphId: 'penal.7', subId: 'e' },
      { paragraphId: 'penal.44', subId: 'b' },
      { paragraphId: 'penal.46', subId: 'b' },
    ],
  },
  {
    id: 'penal.scenario.E7',
    ref: 'E7',
    prompt:
      'Pachatel ujížděl 110 mph po Highway 1 před hlídkou SASP, vyklonil se z okna a opakovaně střílel po pronásledujícím vozidle. Žádný policista nezraněn, hlídka pokračovala v pursuitu.',
    expected: [
      { paragraphId: 'penal.7', subId: 'd' },
      { paragraphId: 'penal.58', subId: 'b' },
      { paragraphId: 'penal.44', subId: 'b' },
    ],
  },
  {
    id: 'penal.scenario.E8',
    ref: 'E8',
    prompt:
      'Po hádce před bistrem pachatel vystřelil třikrát z pistole oběti do hrudi a utekl. Oběť převezena se závažnými zraněními do nemocnice, zachráněna emergency operací. Při dopadení u pachatele nalezena pistole; nemá vydaný zbrojní průkaz.',
    expected: [
      { paragraphId: 'penal.11' },
      { paragraphId: 'penal.46', subId: 'a' },
    ],
    educationalNote:
      '§11 (ne §7c úmyslné střelnou) — tři rány do hrudi indikují jasný úmysl zabít. §11 absorbuje §7 v případě prokazatelného úmyslu zabíjet.',
  },
  {
    id: 'penal.scenario.E9',
    ref: 'E9',
    prompt:
      'Hlídka SASP zajistila místo loupeže páskou a opakovaně vyzvala přihlížejícího, aby místo opustil. Osoba odmítla a snažila se vrátit blíž k zajištěnému místu činu.',
    expected: [{ paragraphId: 'penal.59' }],
  },
];
