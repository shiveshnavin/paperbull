import { Tick } from "../models/Tick";


export type OrderStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';
export type OrderType = 'MARKET' | 'LIMIT';

export interface Order {
    id: string;
    symbol: string;
    type: OrderType;
    price?: number; // Only required for LIMIT orders
    quantity: number;
    status: OrderStatus;
    conditions?: (tick: Tick) => boolean; // Custom conditions
    filledPrice?: number;
    filledAt?: number;
    validityDate: "DAY" | "LONG"
}

export abstract class TradeApi {
    protected orders: Order[] = [];

    abstract placeOrder(order: Order): Promise<Order>;
    abstract cancelOrder(orderId: string): Promise<Order>;
    abstract getOrders(): Promise<Order[]>;
    abstract getProfitAndLoss(): number;

    abstract onTick(tick: Tick): Promise<void>;
}

export class MockTradeApi extends TradeApi {

    async placeOrder(order: Order): Promise<Order> {
        order.status = 'OPEN';
        this.orders.push(order);
        return order;
    }

    async cancelOrder(orderId: string): Promise<Order> {
        const order = this.orders.find(o => o.id === orderId);
        if (order && order.status === 'OPEN') {
            order.status = 'CANCELLED';
        }
        return order!;
    }

    async getOrders(): Promise<Order[]> {
        return this.orders;
    }

    getProfitAndLoss(): number {
        let pnl = 0;
        for (const order of this.orders) {
            if (order.status === 'COMPLETED' && order.filledPrice !== undefined) {
                pnl += (order.filledPrice - (order.price ?? order.filledPrice)) * order.quantity;
            }
        }
        return pnl;
    }

    async onTick(tick: Tick): Promise<void> {
        for (let order of this.orders) {
            if (order.status !== 'OPEN') continue;

            // Check if conditions are met
            if (order.conditions && !order.conditions(tick)) {
                continue;
            }

            if (order.type === 'MARKET') {
                order.status = 'COMPLETED';
                order.filledPrice = tick.last_price;
                order.filledAt = tick.datetime.getTime();
            } else if (order.type === 'LIMIT' && order.price !== undefined && tick.last_price >= order.price) {
                order.status = 'COMPLETED';
                order.filledPrice = order.price;
                order.filledAt = tick.datetime.getTime();
            }
        }
    }
}