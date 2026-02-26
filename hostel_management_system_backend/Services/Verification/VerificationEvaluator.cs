public static class VerificationEvaluator
{
    public static HostelVerificationStatus EvaluateForSubscription(HostelSubscription? subscription)
    {
        if (subscription is null)
        {
            return HostelVerificationStatus.None;
        }

        if (!subscription.IsActive || subscription.ExpiryDate <= DateTime.UtcNow)
        {
            return HostelVerificationStatus.Expired;
        }

        return HostelVerificationStatus.Approved;
    }

    public static bool ShouldSendReminder(HostelSubscription subscription, DateTime utcNow, DateTime reminderThresholdUtc)
    {
        if (!subscription.IsActive)
        {
            return false;
        }

        if (subscription.ExpiryDate < utcNow || subscription.ExpiryDate > reminderThresholdUtc)
        {
            return false;
        }

        if (subscription.LastReminderSentAt is null)
        {
            return true;
        }

        return subscription.LastReminderSentAt.Value.Date < utcNow.Date;
    }
}
