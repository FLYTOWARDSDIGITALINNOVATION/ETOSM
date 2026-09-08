const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Product = mongoose.models.Product || mongoose.model("Product", new mongoose.Schema({}, { strict: false }));

    const formattedDescription = `Choosing the best type of battery that will provide stable power to the device is one of the critical steps while working with electronic devices that require stable and rechargeable power supply. From upgrading your portable electronic gadgets to building a DIY RC toy or Bluetooth speaker, or powering LED lights, it requires you to choose the right battery that will have the required voltage, power, protection, and charging ability.

The ETOSM 3.7V 5200mAh Lithium-Ion Rechargeable Battery can serve the purpose of a good battery to meet the above requirements due to its rechargeable battery storage combined with small size. It is meant for portable electronic devices, RC toys, LED lighting, Bluetooth speakers, and DIY gadgets projects.

Why Choose a Lithium-Ion Battery Pack for Portable Devices?
Portable electronics will also need a power source that will supply them with power but without increasing their size unnecessarily. Disposable batteries may not work well for frequently used portable electronics because of the need to change them from time to time.

Some Areas Where You Can Use the Lithium-Ion Battery Pack:
• RC toys
• LED lights
• Portable electronics
• DIY electronics projects
• IoT gadgets
• Small robotics
• Rechargeable devices
• Portable power solutions

Voltage, current, size, connector type, and charging conditions must be known for all devices before connecting the battery.

Lithium-Ion Battery Pack for Bluetooth Speakers and LED Lights:
Rechargeable battery power is required by many devices such as Bluetooth speakers and LED lights. This battery pack could be an ideal choice for this application as lithium-ion batteries can store energy, are rechargeable, and come in a compact design.

A 5200 mAh battery pack could prove to be ideal for any application where the requirement for more stored energy exists.

Specifications to Verify Before Installation:
• Voltage of battery
• Maximum operating current
• Charging voltage
• Charging current
• Connectors
• Polarity of the connectors
• Physical dimensions
• Chemistry of the battery

Understanding the 3.7V 5200mAh Battery Capacity:
The terms 3.7V and 5200mAh relate to two distinct properties of the battery:
• 3.7V refers to the nominal voltage of the lithium-ion battery.
• 5200mAh indicates the energy storage capacity of the battery pack.

Frequently Asked Questions:

1. What is a lithium-ion battery pack?
A lithium-ion battery pack is a rechargeable battery assembly designed to provide electrical power to compatible electronic devices and systems.

2. What is the voltage of the ETOSM battery?
The ETOSM battery has a nominal voltage of 3.7V and uses lithium-ion battery chemistry.

3. What is the capacity of the battery?
The battery has a nominal capacity of 5200mAh.

4. Does the battery have BMS protection?
Yes. The battery features built-in BMS protection for battery management and protection against specified abnormal operating conditions.

5. Can I use this battery for a Bluetooth speaker?
Yes, provided the Bluetooth speaker is designed for a compatible 3.7V lithium-ion battery and the voltage, connector, polarity, dimensions, and current requirements match.

6. Can this battery be used for RC toys?
It can be used for compatible RC toys that require a 3.7V lithium-ion rechargeable battery. Always check the toy's battery specifications before installation.

7. What connector does the battery use?
The battery uses a JST-XH 2.0mm connector. Connector polarity and compatibility should be verified before connecting it to a device.

8. Does the battery support fast charging?
Yes. The product is designed to support charging up to the specified 2A capability when used with compatible charging equipment.

9. Can I use any charger with this battery?
No. Use a charger or charging circuit specifically designed for a compatible 3.7V lithium-ion battery. An incorrect charger can damage the battery and create safety risks.

Reliable Rechargeable Power for Your Next Project:
There is much to be gained from a good choice when it comes to a battery that is to be used for a portable electronic device. Rather than changing disposable batteries or utilizing an inappropriate power source, a suitable rechargeable battery becomes an ideal solution.

This ETOSM 3.7V 5200mAh lithium-ion battery features good capacity, built-in BMS protection, 2A charge support, and a JST-XH 2.0mm connector.

Whatever project – whether it is related to RC models, Bluetooth speakers, LED lighting, portable devices, or any other DIY electronics – remember to check compatibility between the electrical and physical characteristics of the battery and your hardware prior to mounting.`;

    await Product.findByIdAndUpdate("6a6ef91624814d9aea2c3280", {
      description: formattedDescription
    });

    console.log("✅ Successfully formatted and updated 3.7V 5200mAh Battery in MongoDB Atlas!");
    mongoose.connection.close();
  })
  .catch(err => {
    console.error("Update error:", err);
    process.exit(1);
  });
