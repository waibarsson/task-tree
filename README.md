# TaskTree — GitHub šablona

Jednoduchý **stromový task manager** v čistém HTML/CSS/JS.

## Funkce
- Projekty a úkoly ve stromové struktuře (libovolná hloubka)
- **Semafor** stav u úkolů (červená/žlutá/zelená) — kliknutím cykluje
- **Trvalost** dat v prohlížeči (LocalStorage) — úkoly „nemizí“
- **Koš**: měkké smazání, obnovení nebo trvalé odstranění
- **Přejetí (swipe) nahoru** na mobilu posune úkol o pozici výš mezi sourozenci
- Tlačítko **↑ Posunout** pro desktop
- **Sdílení**: Web Share API (pokud je k dispozici) nebo odkaz s daty v URL (Base64)
- **Export / Import** JSON
- Responzivní **černo/šedý** design

## Použití
1. Otevřete `index.html` v prohlížeči.
2. Přidávejte projekty a úkoly, přepínejte stavy, sdílejte nebo exportujte.

## GitHub šablona
Chcete z tohoto udělat šablonu?
1. Vytvořte nový repozitář na GitHubu s obsahem této složky.
2. V nastavení repozitáře zaškrtněte **Template repository**.
3. (Volitelně) Zapněte GitHub Pages (branch `main`, folder `/root`) a aplikaci pak sdílejte jako web.

## Struktura
```
index.html
style.css
app.js
README.md
```

## Poznámky
- Sdílení přes URL ukládá celý stav do hash (`#data=...`) v Base64. Velmi velké stromy se mohou hůře sdílet přes odkaz.
- Údaje jsou přetrvávány v `localStorage`. Vyčištění prohlížeče je smaže.
