/* Date pentru harta "România Întregită 1918–1939".
   Contururile sunt schematice (desenate manual în coordonate [lon, lat]),
   nu reproduc exact granițele istorice. */

const REGIONS = {
  type: "FeatureCollection",
  features: [
    { type: "Feature",
      properties: { id: "muntenia", name: "Muntenia", group: "regat", note: "Parte a Vechiului Regat. Cuprinde București, capitala țării." },
      geometry: { type: "Polygon", coordinates: [[[24.3,45.6],[24.6,45.6],[25.6,45.55],[26.1,45.7],[26.7,45.7],[27.3,45.5],[28.0,45.43],[28.1,45.2],[27.9,44.8],[28.03,44.34],[27.27,44.12],[26.6,44.0],[25.97,43.9],[25.4,43.75],[24.7,43.7],[24.5,44.1],[24.4,44.6],[24.3,45.1],[24.3,45.6]]] } },
    { type: "Feature",
      properties: { id: "oltenia", name: "Oltenia", group: "regat", note: "Parte a Vechiului Regat, la vest de Olt. Oraș principal: Craiova." },
      geometry: { type: "Polygon", coordinates: [[[22.7,45.3],[23.3,45.6],[24.0,45.65],[24.3,45.6],[24.3,45.1],[24.4,44.6],[24.5,44.1],[24.7,43.7],[23.9,43.75],[23.2,43.85],[22.8,44.1],[22.5,44.45],[22.4,44.6],[22.7,44.7],[22.7,45.3]]] } },
    { type: "Feature",
      properties: { id: "moldova", name: "Moldova", group: "regat", note: "Parte a Vechiului Regat, între Carpați și Prut. Oraș principal: Iași." },
      geometry: { type: "Polygon", coordinates: [[[25.0,47.4],[25.6,47.35],[26.1,47.5],[26.2,47.85],[26.45,48.15],[26.9,47.8],[27.5,47.5],[27.8,47.2],[28.2,46.6],[28.25,46.1],[28.2,45.5],[28.0,45.43],[27.3,45.5],[26.7,45.7],[26.1,45.7],[26.3,46.0],[26.2,46.4],[25.8,46.7],[25.4,47.0],[25.0,47.4]]] } },
    { type: "Feature",
      properties: { id: "dobrogea", name: "Dobrogea", group: "regat", note: "Primită de România în 1878. Include Delta Dunării și litoralul, cu Constanța." },
      geometry: { type: "Polygon", coordinates: [[[27.27,44.12],[28.03,44.34],[27.9,44.8],[28.1,45.2],[28.0,45.43],[28.5,45.3],[28.85,45.2],[29.3,45.3],[29.7,45.25],[29.0,44.7],[28.7,44.3],[28.6,43.8],[27.27,44.12]]] } },
    { type: "Feature",
      properties: { id: "cadrilater", name: "Cadrilaterul (Dobrogea de Sud)", group: "cadrilater", note: "Județele Durostor și Caliacra, cu Silistra și Balcicul. Revine Bulgariei prin Tratatul de la Craiova, 1940." },
      geometry: { type: "Polygon", coordinates: [[[26.6,44.0],[27.27,44.12],[28.6,43.8],[28.55,43.4],[27.6,43.75],[26.6,44.0]]] } },
    { type: "Feature",
      properties: { id: "basarabia", name: "Basarabia", group: "basarabia", note: "Între Prut și Nistru. Oraș principal: Chișinău, sediul Sfatului Țării." },
      geometry: { type: "Polygon", coordinates: [[[26.45,48.15],[26.5,48.3],[26.5,48.5],[27.2,48.45],[28.3,48.15],[29.1,47.8],[29.4,47.3],[29.6,46.85],[30.1,46.5],[30.4,46.2],[30.1,45.7],[29.7,45.4],[29.2,45.45],[28.8,45.35],[28.2,45.5],[28.25,46.1],[28.2,46.6],[27.8,47.2],[27.5,47.5],[26.9,47.8],[26.45,48.15]]] } },
    { type: "Feature",
      properties: { id: "bucovina", name: "Bucovina", group: "bucovina", note: "Fosta provincie austriacă. Oraș principal: Cernăuți." },
      geometry: { type: "Polygon", coordinates: [[[24.9,47.75],[25.1,48.05],[25.6,48.45],[26.1,48.4],[26.5,48.3],[26.45,48.15],[26.2,47.85],[26.1,47.5],[25.6,47.35],[25.0,47.4],[24.9,47.75]]] } },
    { type: "Feature",
      properties: { id: "transilvania", name: "Transilvania", group: "ardeal", note: "Interiorul arcului carpatic. Orașe: Cluj, Sibiu, Brașov, Alba Iulia." },
      geometry: { type: "Polygon", coordinates: [[[22.3,46.2],[22.6,46.6],[23.0,47.0],[23.2,47.45],[23.6,47.4],[24.2,47.35],[25.0,47.4],[25.4,47.0],[25.8,46.7],[26.2,46.4],[26.3,46.0],[26.1,45.7],[25.6,45.55],[24.6,45.6],[24.3,45.6],[24.0,45.65],[23.3,45.6],[22.7,45.3],[22.3,45.6],[22.0,46.0],[22.3,46.2]]] } },
    { type: "Feature",
      properties: { id: "banat", name: "Banatul (partea română)", group: "ardeal", note: "Doar partea de est a Banatului istoric revine României; restul merge la Regatul sârbilor, croaților și slovenilor. Oraș principal: Timișoara." },
      geometry: { type: "Polygon", coordinates: [[[20.27,46.13],[20.75,46.18],[21.0,46.25],[21.5,46.2],[22.0,46.0],[22.3,45.6],[22.7,45.3],[22.7,44.7],[22.4,44.6],[21.6,44.65],[21.4,44.85],[21.0,45.2],[20.7,45.75],[20.27,46.13]]] } },
    { type: "Feature",
      properties: { id: "crisana", name: "Crișana", group: "ardeal", note: "Include Oradea, Aradul și Satu Mare, la granița cu Ungaria." },
      geometry: { type: "Polygon", coordinates: [[[20.75,46.18],[21.0,46.45],[21.5,46.75],[21.9,47.2],[22.2,47.55],[22.5,47.8],[22.95,48.0],[23.3,47.9],[23.2,47.45],[23.0,47.0],[22.6,46.6],[22.3,46.2],[22.0,46.0],[21.5,46.2],[21.0,46.25],[20.75,46.18]]] } },
    { type: "Feature",
      properties: { id: "maramures", name: "Maramureșul (partea română)", group: "ardeal", note: "Zona de la sud de Tisa. Oraș principal: Sighet." },
      geometry: { type: "Polygon", coordinates: [[[23.3,47.9],[24.0,48.0],[24.5,47.95],[24.9,47.75],[25.0,47.4],[24.2,47.35],[23.6,47.4],[23.2,47.45],[23.3,47.9]]] } }
  ]
};

/* Orașe: kind = "major" (afișat mereu când regiunea e în componență) */
const CITIES = [
  { id: "bucuresti", name: "București", lat: 44.43, lon: 26.10, region: "muntenia", major: true },
  { id: "craiova", name: "Craiova", lat: 44.32, lon: 23.80, region: "oltenia", major: true },
  { id: "iasi", name: "Iași", lat: 47.16, lon: 27.59, region: "moldova", major: true },
  { id: "galati", name: "Galați", lat: 45.43, lon: 28.05, region: "moldova", major: true },
  { id: "constanta", name: "Constanța", lat: 44.18, lon: 28.65, region: "dobrogea", major: true },
  { id: "silistra", name: "Silistra", lat: 44.12, lon: 27.27, region: "cadrilater", major: true },
  { id: "balcic", name: "Balcic", lat: 43.41, lon: 28.17, region: "cadrilater", major: false },
  { id: "chisinau", name: "Chișinău", lat: 47.01, lon: 28.86, region: "basarabia", major: true },
  { id: "cetatea-alba", name: "Cetatea Albă", lat: 46.19, lon: 30.34, region: "basarabia", major: false },
  { id: "hotin", name: "Hotin", lat: 48.5, lon: 26.5, region: "basarabia", major: false },
  { id: "cernauti", name: "Cernăuți", lat: 48.29, lon: 25.94, region: "bucovina", major: true },
  { id: "cluj", name: "Cluj", lat: 46.77, lon: 23.59, region: "transilvania", major: true },
  { id: "alba-iulia", name: "Alba Iulia", lat: 46.07, lon: 23.57, region: "transilvania", major: true },
  { id: "brasov", name: "Brașov", lat: 45.65, lon: 25.60, region: "transilvania", major: false },
  { id: "sibiu", name: "Sibiu", lat: 45.80, lon: 24.15, region: "transilvania", major: false },
  { id: "timisoara", name: "Timișoara", lat: 45.76, lon: 21.23, region: "banat", major: true },
  { id: "oradea", name: "Oradea", lat: 47.05, lon: 21.92, region: "crisana", major: true },
  { id: "sighet", name: "Sighet", lat: 47.93, lon: 23.89, region: "maramures", major: false }
];

/* Etichete pentru vecini (context geografic) */
const NEIGHBOURS = [
  { name: "UNGARIA", lat: 47.0, lon: 19.7 },
  { name: "IUGOSLAVIA", lat: 44.6, lon: 20.3 },
  { name: "BULGARIA", lat: 43.0, lon: 25.5 },
  { name: "CEHOSLOVACIA", lat: 48.55, lon: 23.0 },
  { name: "POLONIA", lat: 49.0, lon: 25.4 },
  { name: "U.R.S.S.", lat: 48.0, lon: 31.2 },
  { name: "MAREA NEAGRĂ", lat: 44.4, lon: 30.5 }
];

/* Cronologia. "adds" = regiunile care intră în componență la acest eveniment. */
const EVENTS = [
  { id: "regat", date: "Până în 1913", short: "Vechiul Regat",
    title: "Vechiul Regat",
    text: "România se întemeiază pe Unirea Principatelor (1859) și pe independența din 1877–1878, când primește Dobrogea. Muntenia, Oltenia, Moldova și Dobrogea formează Vechiul Regat.",
    adds: ["muntenia", "oltenia", "moldova", "dobrogea"], admin: "pre" },
  { id: "bucuresti1913", date: "10 aug. 1913", short: "1913",
    title: "Pacea de la București",
    text: "După al Doilea Război Balcanic, Bulgaria cedează României Dobrogea de Sud (Cadrilaterul), cu Silistra și Balcicul.",
    adds: ["cadrilater"], admin: "pre" },
  { id: "basarabia", date: "27 mar. 1918", short: "Mar. 1918",
    title: "Unirea Basarabiei",
    text: "Sfatul Țării de la Chișinău votează unirea Basarabiei cu România (86 de voturi pentru, 3 împotrivă, 36 de abțineri), în contextul prăbușirii Imperiului Rus.",
    adds: ["basarabia"], admin: "pre" },
  { id: "bucovina", date: "28 nov. 1918", short: "Nov. 1918",
    title: "Unirea Bucovinei",
    text: "Congresul General al Bucovinei, întrunit la Cernăuți, votează unirea provinciei cu România.",
    adds: ["bucovina"], admin: "pre" },
  { id: "alba-iulia", date: "1 dec. 1918", short: "1 dec. 1918",
    title: "Marea Adunare Națională de la Alba Iulia",
    text: "1.228 de delegați proclamă unirea Transilvaniei, Banatului, Crișanei și Maramureșului cu România. Se încheie formarea României Mari.",
    adds: ["transilvania", "banat", "crisana", "maramures"], admin: "pre" },
  { id: "saint-germain", date: "10 sept. 1919", short: "1919",
    title: "Tratatul de la Saint-Germain",
    text: "Austria recunoaște trecerea Bucovinei la România. Este primul tratat de pace care confirmă o parte din unirile din 1918.",
    adds: [], admin: "pre" },
  { id: "trianon", date: "4 iun. 1920", short: "Iun. 1920",
    title: "Tratatul de la Trianon",
    text: "Ungaria recunoaște frontierele României: Transilvania, Crișana, Maramureșul și partea de est a Banatului revin României. Restul Banatului merge la Regatul sârbilor, croaților și slovenilor.",
    adds: [], admin: "pre" },
  { id: "paris", date: "28 oct. 1920", short: "Oct. 1920",
    title: "Tratatul de la Paris privind Basarabia",
    text: "Marile puteri aliate recunosc suveranitatea României asupra Basarabiei. Japonia nu ratifică tratatul, iar Uniunea Sovietică nu îl recunoaște.",
    adds: [], admin: "pre" },
  { id: "lege1925", date: "14 iun. 1925", short: "1925",
    title: "Legea unificării administrative",
    text: "Se introduce un sistem administrativ comun pentru toate provinciile: 71 de județe, 489 de plăși și 8.879 de comune.",
    adds: [], admin: "1925" },
  { id: "lege1929", date: "3 aug. 1929", short: "1929",
    title: "Legea administrativă din 1929",
    text: "Legea promulgată de guvernul Partidului Național Țărănesc introduce directoratele ministeriale și o descentralizare limitată: județele sunt grupate în 7 directorate.",
    adds: [], admin: "1929" },
  { id: "tinuturi", date: "14 aug. 1938", short: "1938",
    title: "Reforma administrativă a lui Carol al II-lea",
    text: "Regimul autoritar al regelui Carol al II-lea desființează directoratele și grupează cele 71 de județe în 10 ținuturi, conduse de rezidenți regali.",
    adds: [], admin: "1938" },
  { id: "molotov", date: "23 aug. 1939", short: "Aug. 1939",
    title: "Pactul Molotov–Ribbentrop",
    text: "Protocolul secret dintre Germania și URSS menționează interesul sovietic pentru Basarabia. În 1940, România pierde Basarabia, nordul Bucovinei și Cadrilaterul.",
    adds: [], admin: "1938" }
];

/* Organizarea administrativă pe etape. seats = oraș -> etichetă */
const ADMIN = {
  pre: { title: "Moșteniri administrative diferite",
         text: "Fiecare provincie păstrează sistemul dinainte de unire (românesc, austriac, rus sau maghiar). Unificarea vine abia în 1925.",
         seats: {} },
  "1925": { title: "71 de județe",
            text: "Județele devin unitatea administrativă de bază în toată țara. Împărțirea în plăși și comune este aceeași în toate provinciile.",
            seats: {} },
  "1929": { title: "7 directorate ministeriale",
            text: "Directoratele reflectă provinciile istorice: Muntenia (17 județe), Transilvania (18), Moldova (9), Basarabia (9), Bucovina (7), Oltenia (6) și Banat (5).",
            seats: { bucuresti: "Directorat Muntenia", cluj: "Directorat Transilvania", iasi: "Directorat Moldova", chisinau: "Directorat Basarabia", cernauti: "Directorat Bucovina", craiova: "Directorat Oltenia", timisoara: "Directorat Banat" } },
  "1938": { title: "10 ținuturi",
            text: "Ținuturile Olt, Timiș, Mureș, Someș, Mării, Dunărea de Jos, Prut, Nistru, Suceava și Bucegi nu mai urmează granițele provinciilor istorice.",
            seats: { craiova: "Ținutul Olt", timisoara: "Ținutul Timiș", "alba-iulia": "Ținutul Mureș", cluj: "Ținutul Someș", constanta: "Ținutul Mării", galati: "Ținutul Dunărea de Jos", iasi: "Ținutul Prut", chisinau: "Ținutul Nistru", cernauti: "Ținutul Suceava", bucuresti: "Ținutul Bucegi" } }
};

const GROUPS = {
  regat: { label: "Vechiul Regat", varName: "--c-regat" },
  cadrilater: { label: "Cadrilaterul (1913)", varName: "--c-cadrilater" },
  basarabia: { label: "Basarabia (1918)", varName: "--c-basarabia" },
  bucovina: { label: "Bucovina (1918)", varName: "--c-bucovina" },
  ardeal: { label: "Transilvania, Banat, Crișana, Maramureș (1918)", varName: "--c-ardeal" }
};