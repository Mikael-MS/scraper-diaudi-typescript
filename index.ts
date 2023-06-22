
const pup = require('puppeteer');
const cheerio = require('cheerio');
const moment = require('moment');
const fs = require('fs');

function formatDate(date: Date): string {
    return moment(date).format('DDMMYYYY')
}

function formatPrices(price: string): number {
    const priceSplit: string[] = price.split('R$');
    if (priceSplit.length > 1) {
        const priceText: string = priceSplit[1];
        let numberPrice: number = 0;
        if (priceText.includes('.')) {
            const replacePoint:string = priceText.replace('.', '');
            const replaceComma:string = replacePoint.replace(',', '.');
            numberPrice = formatDecimal(replaceComma);
        } else {
            const replaceComma2:string = priceText.replace(',', '.');
            numberPrice = formatDecimal(replaceComma2);
        }
        return numberPrice
    }
    return 0
}

function formatDecimal(priceTxt: string): number {
    const nrPrice:string = parseFloat((priceTxt)).toFixed(2);
    return parseFloat(nrPrice)
}

async function scraperDiaudi(checkin:Date, checkout: Date, adults:string, children:string) {

    if (moment().isAfter(checkin) || moment(checkin).isAfter(checkout)) {
        return 'Invalid checkin or checkout';
    }

    const dateCheckin:string = moment(checkin).format('DD-MM-YYYY');
    const dateCheckout:string = moment(checkout).format('DD-MM-YYYY');

    const numberAdults:number = Number(adults);
    if (numberAdults < 1) {
        return 'Enter the number of adults'
    }

    const numberChildren:number = Number(children);


    const url = `https://sbreserva.silbeck.com.br/diaudihotel/pt-br/reserva/busca/checkin/${dateCheckin}/checkout/${dateCheckout}/adultos-000001/${numberAdults}/criancas-000004/${numberChildren}`

    const browser = await pup.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForSelector('body > div.container-padrao.reserva > div > div > div > div.content-reserva > div > div.col-12.col-lg-9.pr-lg-0 > div:nth-child(3) > div');

    const html = await page.content();
    const $ = cheerio.load(html);

    const roomData: object[] = [];
    $('body > div.container-padrao.reserva > div > div > div > div.content-reserva > div > div.col-12.col-lg-9.pr-lg-0 > div:nth-child(3) > div > div').each((i:number, room:HTMLElement) => {

        const nameRooms = $(room).find('div > form > div.row > div.col-12.col-lg-7 > div.row.head-apto > div > span');
        const nameRoom:string = nameRooms ? nameRooms.text() : '';

        const totalPrices = $(room).find('div > form > div.info-reserva-quarto > div.tarifas > div:nth-child(2) > div > div.col-6.col-sm-6 > span');
        const totalPrice:string = totalPrices ? totalPrices.text() : '';

        const dailyPrices = $(room).find('div > form > div.info-reserva-quarto > div.tarifas > div:nth-child(2) > div > div.col-6.col-sm-3 > span > span.valor-sem-desconto > span');
        const dailyPrice:string = dailyPrices ? dailyPrices.text() : '';


        const setOfAmenities:string[] = [];

        let amenities = $(room).find('div > form > div.row > div.col-12.col-lg-7 > div.row.caracteristicas-apto.align-items-center > div');
        if (amenities) {
            amenities.each((i:number, convenience:HTMLElement) => {
                const amenity:string = $(convenience).attr('title')
                setOfAmenities.push(amenity);
            })
        } else {
            amenities = null;
        }


        const imgMain = $(room).find('div > form > div.row > div.col-12.col-lg-5.pr-lg-0 > div > div > div.owl-stage-outer > div > div.owl-item.active > div > a');
        const photoMain:string = imgMain ? imgMain.attr('href') : '';


        const allImages:string[] = [];
        let images = $(room).find('div > form > div.row > div.col-12.col-lg-5.pr-lg-0 > div > div > div.owl-stage-outer > div > div.owl-item > div > a');
        if (images) {
            images.each((i:number, imgs:string) => {
                const photos:string = $(imgs).attr('href');
                allImages.push(photos)
            });
        } else {
            images = null;
        }

        roomData.push({
            'nameRoom': nameRoom,
            'description': '',
            'totalPrice': formatPrices(totalPrice),
            'dailyPrice': formatPrices(dailyPrice),
            'amenities': setOfAmenities,
            'photoMain': photoMain,
            'photos': allImages,
            'adults': numberAdults,
            'children': numberChildren
        })

        return roomData
    });

    fs.writeFileSync(`./quotation/${formatDate(checkin)}_${formatDate(checkout)}_${adults}.json`, JSON.stringify(roomData), { encoding: 'utf-8' })


    await browser.close();
}

const checkin:Date = new Date('2023/06/23');
const checkout: Date = new Date('2023/06/25');
const adults:string = '2';
const children:string = '1';

const resp = scraperDiaudi(checkin, checkout, adults, children);
console.log(resp)