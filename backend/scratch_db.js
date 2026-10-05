const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");
require("dotenv").config();

const formattedDescription = `Bluetooth Receiver and Amplifier for Speakers

Boost the audio system of your house with the ETOSM AX200 Bluetooth Receiver & Amplifier for Speakers. An ideal choice for a clear sound system with stereo, the 2-channel amplifier features 40W + 40W power output and has Bluetooth 5.0, USB, SD Card, FM Radio, AUX, and RCA connectivity. This device works best for home entertainment system, bookshelf speakers, do-it-yourself audio equipment, and office sound system. Just plug in your 4-ohm speakers and play music without wires.

Key Features
• Bluetooth 5.0 audio streaming
• Stereo audio power rating of 40 W + 40 W
• Audio device using USB or SD card
• Radio
• Compatible with AUX and RCA inputs
• IR remote controller included
• Designed for use with 4-ohm speakers
• Compact and can be installed
• Superior quality of sound reproduction with low distortion

Why Choose the ETOSM AX200 Bluetooth Amplifier?
This is made possible by the ETOSM AX200 which integrates the ease of using wireless technology and flexibility of sound playback in one handy machine. You can listen to music being streamed from your mobile device, play your songs from the USB drive, or connect your television through the AUX port in this device.

Applications
• Home audio systems
• Bookshelf speakers
• Desktop speaker setup
• TV audio enhancement
• Office music systems
• Small event audio
• DIY speaker projects
• Workshop or garage sound system

Package Includes
• 1 × ETOSM AX200 Stereo Amplifier
• 1 × IR Remote Control
• 1 × User Manual

Frequently Asked Questions

1. What is the ETOSM AX200 used for?
It amplifies audio and allows wireless Bluetooth streaming to passive speakers.

2. Does it support Bluetooth 5.0?
Yes. It features Bluetooth 5.0 for stable and fast wireless connectivity.

3. Can I connect USB and SD cards?
Yes. The amplifier supports both USB drives and SD cards for music playback.

4. Is this amplifier compatible with 4-ohm speakers?
Yes. It is designed to work efficiently with 4-ohm speakers.

5. Does it include an FM radio?
Yes. The amplifier has a built-in FM radio for listening to local stations.

6. Can I connect my TV or computer?
Yes. You can connect using the AUX or RCA input for high-quality audio.

7. Is a remote control included?
Yes. An IR remote is included for convenient operation.

8. Is this suitable for home audio systems?
Yes. It is ideal for home entertainment, music systems, offices, and DIY speaker setups.

Buy Bluetooth Receiver and Amplifier for Speakers Online
Go for the ETOSM AX200 Bluetooth Receiver and Amplifier for Speakers to get top-class performance, versatile connectivity, and impressive stereo audio. For all those who are looking for a great amplifier to install at home or in an office setting, the ETOSM AX200 is a great buy. This device comes with great value and performance.`;

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Product = mongoose.models.Product || mongoose.model("Product", new mongoose.Schema({}, { strict: false }));

    const updated = await Product.findByIdAndUpdate(
      "6a33b1609a7c29aff71ebb1a",
      {
        name: "Bluetooth Receiver and Amplifier for Speakers",
        slug: "bluetooth-receiver-and-amplifier-for-speakers",
        description: formattedDescription
      },
      { new: true }
    );

    console.log("✅ Successfully updated product!");
    console.log("Product ID:", updated._id);
    console.log("Product Name:", updated.name);
    console.log("Product Slug:", updated.slug);
    console.log("Description length:", updated.description.length);

    mongoose.connection.close();
  })
  .catch(err => {
    console.error("Update failed:", err);
    process.exit(1);
  });
