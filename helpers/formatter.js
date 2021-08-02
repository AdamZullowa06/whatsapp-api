const phoneNumberFormatter = function(number) {
    // 1. Menghilangkan karakter selain angka
    let formatted = number.replace(/\D/g, '');

    // 2. the number is startwith '0', 
    // please change international code '62' according to the country of origin.
    if(formatted.startsWith('0')) {
        formatted = '62' + formatted.substr(1);
    }

    // 3. Menghilangkan karater '@c.us' di akhir
    if(!formatted.endsWith('@c.us')) {
        formatted += '@c.us';
    }

    return formatted;
}

module.exports = {
    phoneNumberFormatter
}