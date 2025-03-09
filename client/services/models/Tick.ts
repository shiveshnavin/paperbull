export class Tick {
    symbol;
    stockData;
    datetime;
    high;
    low;
    open;
    change;
    depth: {
        buy: [{ quantity: number, price: number, orders: number }],
        sell: [{ quantity: number, price: number, orders: number }]
    };
    close;
    volume;
    oi;
    last_price;

    constructor(body: any) {
        this.symbol = body.symbol || body.tradingsymbol;
        this.datetime = body.datetime || new Date(body.exchange_timestamp);
        this.high = parseFloat(body.high || body.ohlc?.high || body?.last_price);
        this.low = parseFloat(body.low || body.ohlc?.low || body?.last_price);
        this.open = parseFloat(body.open || body.ohlc?.open || body?.last_price);
        this.close = parseFloat(body.close || body.ohlc?.close || body?.last_price);
        this.volume = parseFloat(body.volume || body.volume_traded);
        this.depth = body.depth
        this.oi = parseFloat(body.oi);
        this.last_price = parseFloat(body.last_price || body.close || body.ohlc?.close);
        this.change = parseFloat(body.change)
        this.stockData = body.stockData;
    }
    getTime(): string {
        const date = new Date(this.datetime);
        // Convert to IST (UTC+5:30)
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const istTime = new Date(date.getTime() + istOffset);

        // Format as HHmm
        const hours = String(istTime.getUTCHours()).padStart(2, '0');
        const minutes = String(istTime.getUTCMinutes()).padStart(2, '0');
        return `${hours}${minutes}`;
    }

    getTimeFormatted(): string {
        const date = new Date(this.datetime);
        // Convert to IST (UTC+5:30)
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const istTime = new Date(date.getTime() + istOffset);


        // Format as HHmm
        const hours = String(istTime.getUTCHours()).padStart(2, '0');
        const minutes = String(istTime.getUTCMinutes()).padStart(2, '0');
        const secs = String(istTime.getUTCSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${secs}`;
    }

    // Get the current date in IST (YYYY-MM-DD format)
    getDate(): string {
        const date = new Date(this.datetime);
        // Convert to IST (UTC+5:30)
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const istDate = new Date(date.getTime() + istOffset);

        // Format as YYYY-MM-DD
        const year = istDate.getUTCFullYear();
        const month = String(istDate.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(istDate.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getType() {
        if (this.symbol.includes("INDEX")) {
            return "Index"
        }
        else if (this.symbol.includes("CE")) {
            return "Call Option"
        }
        else if (this.symbol.includes("PE")) {
            return "Put Option"
        }
        else if (this.symbol.includes("FUT")) {
            return "Future"
        } else {
            return "Equity"
        }
    }

    getReadableName() {
        let symbol = this.symbol
        if (!symbol) {
            return "";
        }
        const parts = symbol.match(/([A-Z]+)(\d{4})(\d{2})(\d{2})(CE|PE)(\d+)/);
        if (!parts) {
            return symbol.split("-")[0]?.trim(); // Return original if parsing fails
        }
        const [, underlying, year, month, day, optionType, strikePrice] = parts;
        const monthNames = [
            "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
            "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
        ];
        const monthIndex = parseInt(month, 10) - 1;
        const monthName = monthNames[monthIndex];
        return `${underlying} ${monthName} ${parseInt(day, 10)} ${strikePrice} ${optionType}`;
    }

    summary() {
        let copy: any = {};
        Object.assign(copy, this)
        copy.symbol = this.stockData.tradingsymbol;
        delete copy.stockData
        return copy;
    }

    toString() {
        return `${new Date(this.datetime).getHours()}:${new Date(this.datetime).getMinutes()}:${new Date(this.datetime).getSeconds()} ${this.symbol} ${this.close}`
    }
}