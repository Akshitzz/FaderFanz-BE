
import Campaign from '../models/Campaign.js';
import Event from '../models/Event.js';
import Payment from '../models/Payment.js';
export const createCampaign = async (req, res) => {
  try {
    const { title, description, event, goal, startDate, endDate, rewards } = req.body;

    // Check if user can create campaigns
    const allowedRoles = ['sponsor', 'curator', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to create campaigns' });
    }

    // Check if event exists
    const eventExists = await Event.findById(event);
    if (!eventExists) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the creator of the event
    if (eventExists.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only create campaigns for your own events' });
    }

    // Set the event as crowdfunded
    await Event.findByIdAndUpdate(event, { isCrowdfunded: true });

    const campaign = new Campaign({
      title,
      description,
      creator: req.user.id,
      event,
      goal,
      startDate,
      endDate,
      rewards: rewards || [],
      status: 'draft'
    });

    await campaign.save();

    res.status(201).json({
      message: 'Campaign created successfully',
      campaign
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getCampaignsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const campaigns = await Campaign.find({ event: eventId })
      .populate('creator', 'firstName lastName username')
      .populate('event', 'title startDate endDate');

    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('creator', 'firstName lastName username')
      .populate('event', 'title description startDate endDate')
      .populate('donors.user', 'firstName lastName username');
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check if user is authorized to update this campaign
    if (campaign.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this campaign' });
    }

    const updateData = req.body;
    
    // Don't allow changing creator or event
    delete updateData.creator;
    delete updateData.event;

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Campaign updated successfully',
      campaign: updatedCampaign
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const launchCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check if user is authorized to launch this campaign
    if (campaign.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to launch this campaign' });
    }

    // Check if the campaign can be launched
    if (campaign.status !== 'draft') {
      return res.status(400).json({ message: `Campaign cannot be launched from ${campaign.status} status` });
    }

    campaign.status = 'active';
    await campaign.save();

    res.json({
      message: 'Campaign launched successfully',
      campaign
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const addCampaignUpdate = async (req, res) => {
  try {
    const { title, content } = req.body;
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check if user is authorized to update this campaign
    if (campaign.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to add updates to this campaign' });
    }

    campaign.updates.push({
      title,
      content,
      date: new Date()
    });

    await campaign.save();

    res.json({
      message: 'Update added to campaign',
      campaign
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const donateToCampaign = async (req, res) => {
  try {
    const { amount, paymentMethod, rewardTier } = req.body;
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check if campaign is active
    if (campaign.status !== 'active') {
      return res.status(400).json({ message: 'Campaign is not active' });
    }

    // Process payment (simplified, in a real app would integrate with payment gateway)
    const payment = new Payment({
      user: req.user.id,
      amount,
      paymentType: 'donation',
      status: 'completed', // In reality, this would be set after payment confirmation
      paymentMethod,
      campaign: campaign._id,
      event: campaign.event
    });

    await payment.save();

    // Update campaign with donation
    campaign.amountRaised += amount;
    campaign.donors.push({
      user: req.user.id,
      amount,
      date: new Date()
    });

    // Check if goal reached
    if (campaign.amountRaised >= campaign.goal) {
      campaign.status = 'completed';
    }

    await campaign.save();

    res.json({
      message: 'Donation successful',
      payment,
      campaign
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};