# Fietsweer

## Over dit project
Fietsweer is een webapplicatie ontworpen om fietsers snel en accuraat inzicht te geven in de weersomstandigheden op hun locatie. De applicatie maakt gebruik van een interactieve kaart en gedetailleerde weersvoorspellingen om te helpen bij het plannen van een fietstocht. 

## Functionaliteiten
- **Locatiebepaling**: De kaart centreert automatisch op je huidige locatie.
- **Interactieve Kaart**: Sleep de rode marker om het weer op een andere locatie te bekijken.
- **Gedetailleerde Voorspelling**: Bekijk de voorspelling per uur voor de komende uren, inclusief temperatuur, windkracht (km/h), windrichting en neerslagkans.
- **Buienradar Integratie**: Als je locatie zich in België bevindt, verschijnt er een directe link naar de Buienradar voor die specifieke regio.
- **Dynamische Interface**: De applicatie past zich aan aan dag en nacht, en het icoon in de browser verandert mee met het weer.

## Gebruik
1. Open de applicatie in je browser.
2. Geef toestemming voor locatiegebruik wanneer hierom wordt gevraagd.
3. Bekijk de weersinformatie in het paneel bovenaan.
4. Klik op het pijltje om het paneel in of uit te klappen.
5. Versleep de rode marker op de kaart om de weersverwachting voor een andere plek te zien.

## Hosting op Netlify

Deze applicatie kan eenvoudig en gratis gehost worden via Netlify. Volg onderstaande stappen:

### 1. Code uploaden
Je kunt je project direct vanuit GitHub importeren in Netlify, of de 'dist' map slepen naar het Netlify dashboard na het bouwen van de applicatie (commando: `npm run build`).

### 2. Environment Variables instellen
Om de weersgegevens op te halen, is een API-sleutel van OpenWeatherMap vereist. Deze mag niet hardcoded in de bestanden staan, maar moet als variabele worden ingesteld.

1. Ga in het Netlify dashboard naar je site.
2. Klik op **Site configuration**.
3. Kies in het linkermenu voor **Environment variables**.
4. Klik op **Add a variable**.
5. Vul de volgende gegevens in:
   - **Key**: `VITE_OPENWEATHER_API_KEY`
   - **Value**: [Jouw OpenWeatherMap API sleutel]
6. Sla de wijzigingen op.

Als je de site koppelt via Git, wordt bij een volgende 'deploy' de sleutel automatisch gebruikt.
