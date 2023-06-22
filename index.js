"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const pup = require('puppeteer');
const cheerio = require('cheerio');
const moment = require('moment');
const fs = require('fs');
function formatDate(date) {
    return moment(date).format('DDMMYYYY');
}
function formatPrices(price) {
    const priceSplit = price.split('R$');
    if (priceSplit.length > 1) {
        const priceText = priceSplit[1];
        let numberPrice = 0;
        if (priceText.includes('.')) {
            const replacePoint = priceText.replace('.', '');
            const replaceComma = replacePoint.replace(',', '.');
            numberPrice = formatDecimal(replaceComma);
        }
        else {
            const replaceComma2 = priceText.replace(',', '.');
            numberPrice = formatDecimal(replaceComma2);
        }
        return numberPrice;
    }
    return 0;
}
function formatDecimal(priceTxt) {
    const nrPrice = parseFloat((priceTxt)).toFixed(2);
    return parseFloat(nrPrice);
}
function scraperDiaudi(checkin, checkout, adults, children) {
    return __awaiter(this, void 0, void 0, function* () {
        if (moment().isAfter(checkin) || moment(checkin).isAfter(checkout)) {
            return 'Invalid checkin or checkout';
        }
        const dateCheckin = moment(checkin).format('DD-MM-YYYY');
        const dateCheckout = moment(checkout).format('DD-MM-YYYY');
        const numberAdults = Number(adults);
        if (numberAdults < 1) {
            return 'Enter the number of adults';
        }
        const numberChildren = Number(children);
        const url = `https://sbreserva.silbeck.com.br/diaudihotel/pt-br/reserva/busca/checkin/${dateCheckin}/checkout/${dateCheckout}/adultos-000001/${numberAdults}/criancas-000004/${numberChildren}`;
        const browser = yield pup.launch({ headless: true });
        const page = yield browser.newPage();
        yield page.goto(url);
        yield page.waitForSelector('body > div.container-padrao.reserva > div > div > div > div.content-reserva > div > div.col-12.col-lg-9.pr-lg-0 > div:nth-child(3) > div');
        const html = yield page.content();
        const $ = cheerio.load(html);
        const roomData = [];
        $('body > div.container-padrao.reserva > div > div > div > div.content-reserva > div > div.col-12.col-lg-9.pr-lg-0 > div:nth-child(3) > div > div').each((i, room) => {
            const nameRooms = $(room).find('div > form > div.row > div.col-12.col-lg-7 > div.row.head-apto > div > span');
            const nameRoom = nameRooms ? nameRooms.text() : '';
            const totalPrices = $(room).find('div > form > div.info-reserva-quarto > div.tarifas > div:nth-child(2) > div > div.col-6.col-sm-6 > span');
            const totalPrice = totalPrices ? totalPrices.text() : '';
            const dailyPrices = $(room).find('div > form > div.info-reserva-quarto > div.tarifas > div:nth-child(2) > div > div.col-6.col-sm-3 > span > span.valor-sem-desconto > span');
            const dailyPrice = dailyPrices ? dailyPrices.text() : '';
            const setOfAmenities = [];
            let amenities = $(room).find('div > form > div.row > div.col-12.col-lg-7 > div.row.caracteristicas-apto.align-items-center > div');
            if (amenities) {
                amenities.each((i, convenience) => {
                    const amenity = $(convenience).attr('title');
                    setOfAmenities.push(amenity);
                });
            }
            else {
                amenities = null;
            }
            const imgMain = $(room).find('div > form > div.row > div.col-12.col-lg-5.pr-lg-0 > div > div > div.owl-stage-outer > div > div.owl-item.active > div > a');
            const photoMain = imgMain ? imgMain.attr('href') : '';
            const allImages = [];
            let images = $(room).find('div > form > div.row > div.col-12.col-lg-5.pr-lg-0 > div > div > div.owl-stage-outer > div > div.owl-item > div > a');
            if (images) {
                images.each((i, imgs) => {
                    const photos = $(imgs).attr('href');
                    allImages.push(photos);
                });
            }
            else {
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
            });
            return roomData;
        });
        fs.writeFileSync(`./quotation/${formatDate(checkin)}_${formatDate(checkout)}_${adults}.json`, JSON.stringify(roomData), { encoding: 'utf-8' });
        yield browser.close();
    });
}
const checkin = new Date('2023/06/23');
const checkout = new Date('2023/06/25');
const adults = '2';
const children = '1';
const resp = scraperDiaudi(checkin, checkout, adults, children);
console.log(resp);
