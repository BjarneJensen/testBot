"use strict";

const puppeteer = require("puppeteer-core");
const api = require("kucoin-futures-node-api");
const config = {
  apiKey: "",
  secretKey: "",
  passphrase: "",
  environment: ""
};
const apiLive = new api();
apiLive.init(config);

const waitFor = delay => new Promise(resolve => setTimeout(resolve, delay));

var params = {};
var profit = 0;
//var balance = 250;
var leverage = 5;
var entry = null;
var quant = null;
var exit;
var signal = null;
var snapshot;
var balance;
var position;
var counter=0;

(async () => {


await  apiLive.initSocket({ topic: "balances" }, msg => {
    let data = JSON.parse(msg);
    balance = data.data;
    //  console.log(data.data)
  });
await  apiLive.initSocket({ topic: "snapshot", symbols: ["ETCUSDTM"] }, msg => {
    let data = JSON.parse(msg);
    snapshot = data.data;
  });
await  apiLive.initSocket({ topic: "position", symbols: ["ETCUSDTM"] }, msg => {
    let data = JSON.parse(msg);
    position = data;
    //console.log(data)
  });
  await waitFor(3000);

  balance  = await apiLive.getAccountOverview({currency: "USDT"})
  balance=balance.data["availableBalance"];
  await waitFor(3000);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    userDataDir: "/home/pi/.config/chromium/",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox", //,'--user-data-dir=/home/pi/.config/chromium'
      "--profile-directory=/home/pi/.config/chromium/Default"
    ]
  });
  const page = await browser.newPage();
  await page.goto(
    "https://www.tradingview.com/chart/yXaYq997/?symbol=BINANCE%3AETCUSDTPERP"
  );
  await page.waitForSelector(".scrollContainer-E_zUMSTB");
  await page.waitForSelector(".buttonText-_W8EGxGy");
  await page.waitForSelector(".message-_BiOF1cO");

  await page.evaluate(
    () => {

      signal = document.querySelector(".message-_BiOF1cO").textContent;
      console.log(signal);
      const mutate = mutations => {
        mutations.forEach(mutation => {
          //console.log("close " + signal);
          if (
            signal != document.querySelector(".message-_BiOF1cO").textContent
          ) {
            signal = document.querySelector(".message-_BiOF1cO").textContent;
            console.log(signal);
          }
        });
      };

      const target = document.querySelector(".scrollContainer-E_zUMSTB");
      const observer = new MutationObserver(mutate);
      const config = {
        characterData: true,
        attributes: false,
        childList: true,
        subtree: true
      };

      // document.querySelectorAll('.valueValue-G1_Pfvwd')[4].innerHTML

      observer.observe(target, config);
    });
  // console.log(profit);
  page.on("console", async msg => {
    let price = snapshot.lastPrice;
    let id = position.userId;

    //close order
    params = {
      clientOid: id,
      closeOrder: true,
      symbol: "ETCUSDTM",
      type: "market"
    };
    await apiLive.placeOrder(params);
    await waitFor(8000);

    let bal = balance["availableBalance"];

    if (msg.text() === "buy") {
      let size = Math.floor((bal * 5 * 10) / price) - .1;
      params = {
        clientOid: "test",
        side: `${msg.text()}`,
        symbol: "ETCUSDTM",
        type: "market",
        leverage: "5",
        size: size
      };
      let sl = {
        clientOid: "test",
        side: "sell",
        symbol: "ETCUSDTM",
        type: "market",
        leverage: "5",
        stop: "down",
        stopPriceType: "TP",
        stopPrice: String(price - price * 0.025),
        reduceOnly: true,
        size: size
      };
      let tp = {
        clientOid: "test",
        side: "sell",
        symbol: "ETCUSDTM",
        type: "market",
        leverage: "5",
        stop: "up",
        stopPriceType: "TP",
        stopPrice: String(price + price * 0.05),
        reduceOnly: true,
        size: size
      };

      await apiLive.placeOrder(params);
      await waitFor(10000);
      counter++

      // await apiLive.placeOrder(sl);
      // await waitFor(10000);
      // await apiLive.placeOrder(tp);
      // await waitFor(3000);
    //  console.log(msg.text());
    } else if (msg.text() === "sell") {
      let size = Math.floor((bal * 5 * 10) / price) - .1;
      params = {
        clientOid: "test",
        side: `${msg.text()}`,
        symbol: "ETCUSDTM",
        type: "market",
        leverage: "5",
        size: size
      };
      let sl = {
        clientOid: "test",
        side: "sell",
        symbol: "ETCUSDTM",
        type: "market",
        leverage: "5",
        stop: "up",
        stopPriceType: "TP",
        stopPrice: String(price + price * 0.025),
        reduceOnly: true,
        size: size
      };
      let tp = {
        clientOid: "test",
        side: "sell",
        symbol: "ETCUSDTM",
        type: "market",
        leverage: "5",
        stop: "down",
        stopPriceType: "TP",
        stopPrice: String(price - price * 0.05),
        reduceOnly: true,
        size: size
      };

      await apiLive.placeOrder(params);
      await waitFor(10000);
      counter++
      // await apiLive.placeOrder(sl);
      // await waitFor(10000);
      // await apiLive.placeOrder(tp);
      // await waitFor(3000);
    }
    console.log(msg.text());
    if(counter>=2){process.exit()}
  });

  // await page.screenshot({ path: "example.png" });
    //await browser.close();
})();
