import * as amqp from 'amqplib';
import axios from 'axios';
import { OrderEvents } from '../types';

let channel: amqp.Channel;

const connectRabbitMQ = async (): Promise<void> => {
  try {
    const connection = await amqp.connect({
      protocol: "amqp",
      hostname: process.env.RABBITMQ_HOST,
      port: Number(process.env.RABBITMQ_PORT),
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD,
    });

    channel = await connection.createChannel();

    // Assert exchange for pub/sub pattern
    await channel.assertExchange('order-events', 'topic', { durable: true });

    console.log("RabbitMQ connected successfully 👌");
  } catch (error) {
    console.error("Error connecting to RabbitMQ:", error);
  }
};

const publishToExchange = async (routingKey: string, message: any): Promise<void> => {
  if (!channel) {
    console.error("RabbitMQ Channel is not initialized.");
    return;
  }

  try {
    await channel.publish(
      'order-events',
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    console.log(`Message published to exchange with routing key: ${routingKey}`);
  } catch (error) {
    console.error("Error publishing message to exchange:", error);
  }
};

class EventService {
  private userServiceUrl = process.env.USER_SERVICE_URL;
  private paymentServiceUrl = process.env.PAYMENT_SERVICE_URL;

  async connect(): Promise<void> {
    await connectRabbitMQ();
  }

  async publishEvent<T extends keyof OrderEvents>(
    eventType: T,
    data: OrderEvents[T]
  ): Promise<void> {
    try {
      const message = {
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
        service: 'order-service'
      };

      // Publish to RabbitMQ exchange
      await publishToExchange(eventType as string, message);

      // Send HTTP events to other services
      const httpPromises = [];
      
      if (this.userServiceUrl) {
        httpPromises.push(
          axios.post(`${this.userServiceUrl}/events`, message).catch((error) => {
            console.error('Failed to send event to user service:', error.message);
          })
        );
      }

      if (this.paymentServiceUrl) {
        httpPromises.push(
          axios.post(`${this.paymentServiceUrl}/events`, message).catch((error) => {
            console.error('Failed to send event to payment service:', error.message);
          })
        );
      }

      // Wait for all HTTP requests to complete
      await Promise.allSettled(httpPromises);

      console.log(`✅ Event ${String(eventType)} published successfully to all services`);
    } catch (error) {
      console.error(`❌ Failed to publish event ${String(eventType)}:`, error);
    }
  }
}

export const eventService = new EventService();