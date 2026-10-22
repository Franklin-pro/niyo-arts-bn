import { Request, Response } from "express";
import { ContactMessage } from "../models/index.js";
import { createContactMessageSchema } from "../validators/contact.validators.js";
import { sendContactNotification } from "../services/email.service.js";

export async function createContactMessage(
  req: Request,
  res: Response,
): Promise<void> {
  const input = createContactMessageSchema.parse(req.body);
  const message = await ContactMessage.create({
    name: input.name,
    email: input.email.toLowerCase(),
    subject: input.subject || null,
    message: input.message,
  });
  let notificationEmail: "sent" | "failed" = "sent";
  try {
    await sendContactNotification({
      name: input.name,
      email: input.email,
      subject: input.subject,
      message: input.message,
    });
  } catch (error) {
    notificationEmail = "failed";
    console.error(`Failed to email contact message ${message.id}:`, error);
  }
  res.status(201).json({
    message: "Your message has been received.",
    data: { id: message.id, status: message.status, notificationEmail },
    ...(notificationEmail === "failed"
      ? { warning: "Message saved, but the notification email could not be sent." }
      : {}),
  });
}
